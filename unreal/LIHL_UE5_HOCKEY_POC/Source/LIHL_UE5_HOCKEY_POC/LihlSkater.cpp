// LihlSkater.cpp  NOT COMPILED, NOT RUN. Port of game.html step() skater part (line 660-664) + skate() (561-592) via LihlSimMath.h.
#include "LihlSkater.h"
#include "Components/CapsuleComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "InputActionValue.h"
#include "Kismet/GameplayStatics.h"
#include "EngineUtils.h"
#include "LihlCoords.h"
#include "LihlPuck.h"
#include "LihlGameMode.h"

using namespace Lihl;

ALihlSkater::ALihlSkater()
{
	PrimaryActorTick.bCanEverTick = true;
	// Skater is about 6 ft tall with ~1.3 ft radius; the sim separation radius is 4.4 ft between centres (line 662), enforced by the capsules plus GameMode.
	GetCapsuleComponent()->InitCapsuleSize(.9f * FtToCm, 3.f * FtToCm);
	UCharacterMovementComponent* M = GetCharacterMovement();
	M->SetMovementMode(MOVE_Flying);          // TODO(verify on compile): we drive Velocity ourselves; flying avoids gravity/ground friction
	M->GravityScale = 0.f;
	M->BrakingDecelerationFlying = 0.f;
	M->MaxFlySpeed = 60.f * FtToCm;           // sim max is mx*1.15 (about 60 ft/s) - the sim clamps before this does
	M->bOrientRotationToMovement = false;
	M->bUseControllerDesiredRotation = false;
	bUseControllerRotationYaw = false;
}

void ALihlSkater::BeginPlay()
{
	Super::BeginPlay();
	if (ALihlGameMode* GM = GetWorld()->GetAuthGameMode<ALihlGameMode>()) GM->Skaters.AddUnique(this);
	if (APlayerController* PC = Cast<APlayerController>(GetController()))
		if (UEnhancedInputLocalPlayerSubsystem* Sub = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(PC->GetLocalPlayer()))
			if (MappingContext) Sub->AddMappingContext(MappingContext, 0);
	float Dummy;
	LihlCoords::WorldToSim(GetActorLocation(), SimX, SimY, Dummy);
	Skate.fa = FMath::DegreesToRadians(GetActorRotation().Yaw);
}

void ALihlSkater::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);
	if (UEnhancedInputComponent* EIC = Cast<UEnhancedInputComponent>(PlayerInputComponent))
	{
		if (MoveAction)
		{
			EIC->BindAction(MoveAction, ETriggerEvent::Triggered, this, &ALihlSkater::OnMove);
			EIC->BindAction(MoveAction, ETriggerEvent::Completed, this, &ALihlSkater::OnMoveReleased);
		}
		if (ShootAction) EIC->BindAction(ShootAction, ETriggerEvent::Started, this, &ALihlSkater::OnShoot);
		if (PassAction) EIC->BindAction(PassAction, ETriggerEvent::Started, this, &ALihlSkater::OnPass);
	}
}

void ALihlSkater::OnMove(const FInputActionValue& V) { const FVector2D A = V.Get<FVector2D>(); Desired = FVector2D(A.Y, A.X); } // stick up = +x down the rink; TODO(verify on compile): axis mapping depends on the IMC
void ALihlSkater::OnMoveReleased(const FInputActionValue&) { Desired = FVector2D::ZeroVector; }
void ALihlSkater::OnShoot() { ReleasePuck(80.f, 0.f, true); }  // TODO: charge time -> power, kind, loft. line 458-466 NOT ported.
void ALihlSkater::OnPass() { ReleasePuck(55.f, 0.f, false); }  // TODO: target selection (pass(), line 480-496) NOT ported.

void ALihlSkater::ApplyPlayerRow(const FLihlPlayerRow& R)
{
	SimSpd = R.SimSpd; SimShot = R.SimShot; SimPass = R.SimPass; SimChk = R.SimChk; SimDef = R.SimDef; Stamina = R.SimStaminaStart;
}

ALihlPuck* ALihlSkater::FindPuck() const
{
	for (TActorIterator<ALihlPuck> It(GetWorld()); It; ++It) return *It; // TODO: cache in GameMode
	return nullptr;
}

void ALihlSkater::GetBladeSim(float& OutX, float& OutY) const
{
	const float Speed = std::hypot(Skate.vx, Skate.vy);
	const float Sw = std::sin(Clock * 7.f + (float)Slot) * FMath::Min(1.2f, Speed / 28.f);
	OutX = SimX + std::cos(Skate.fa) * 4.f - std::sin(Skate.fa) * Sw;
	OutY = SimY + std::sin(Skate.fa) * 4.f + std::cos(Skate.fa) * Sw;
}

void ALihlSkater::ReleasePuck(float SpeedFtS, float LiftFtS, bool bIsShot)
{
	ALihlPuck* Puck = FindPuck();
	if (!Puck || Puck->Carrier != this) return;
	Puck->Release(std::cos(Skate.fa) * SpeedFtS, std::sin(Skate.fa) * SpeedFtS, LiftFtS, bIsShot, SpeedFtS / 10.f);
}

void ALihlSkater::Tick(float Dt)
{
	Super::Tick(Dt);
	Clock += Dt;
	StunSec = FMath::Max(0.f, StunSec - Dt); BurstSec = FMath::Max(0.f, BurstSec - Dt);
	ALihlPuck* Puck = FindPuck();
	const bool bHasPuck = Puck && Puck->Carrier == this;
	FSkateInput In;
	In.dvx = (float)Desired.X; In.dvy = (float)Desired.Y;
	In.SpdAttr = SimSpd; In.bIsControlled = bIsControlled; In.bHasPuck = bHasPuck;
	In.MaxSpeed = ComputeMaxSpeed(SimSpd, DifficultySpd, Stamina, bHasPuck, BurstSec > 0.f, bIsControlled, StunSec > 0.f);
	SkateStep(Skate, In, Dt);
	// line 664: stamina drain and position integration with clamps; the engine sweeps the capsule, we keep the sim position as the truth
	Stamina = Clamp(Stamina - Dt * .0075f * (std::hypot(Skate.vx, Skate.vy) / (24.f + 20.f * SimSpd)) * (bHasPuck ? 1.1f : 1.f), 0.f, 1.f);
	SimX = Clamp(SimX + Skate.vx * Dt, 7.f, W - 7.f);
	SimY = Clamp(SimY + Skate.vy * Dt, 2.5f, H - 2.5f);
	GetCharacterMovement()->Velocity = FVector(Skate.vx, Skate.vy, 0.f) * FtToCm; // lets the engine sweep against other blockers
	SetActorRotation(FRotator(0.f, FMath::RadiansToDegrees(Skate.fa), 0.f));
	// Hard sync of the actor to the sim position (the capsule sweep result is read back next frame via GetBladeSim/SimX)
	// TODO(verify on compile): decide between "sim position is truth" (this) and "movement component is truth" (read back with WorldToSim).
	SetActorLocation(LihlCoords::SimToWorld(SimX, SimY, 0.f) + FVector(0, 0, GetCapsuleComponent()->GetScaledCapsuleHalfHeight()), true);
	EdgeLean = Skate.edge; StopAmount = Skate.stp; StridePhase = Skate.ph; bSkatingBackward = Skate.bBack; bIceSpray = Skate.bSpray;
}
