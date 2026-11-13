// LihlPuck.cpp  NOT COMPILED, NOT RUN. Ported from game.html (puckVert 437, puckPost 444, free puck step 681-683, carried puck 676-679, pickup 680).
#include "LihlPuck.h"
#include "Components/SphereComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/World.h"
#include "Kismet/GameplayStatics.h"
#include "UObject/ConstructorHelpers.h"
#include "LihlCoords.h"
#include "LihlRink.h"
#include "LihlSkater.h"
#include "LihlGameMode.h"

using namespace Lihl;

ALihlPuck::ALihlPuck()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.TickGroup = TG_PrePhysics;
	Collision = CreateDefaultSubobject<USphereComponent>(TEXT("Collision"));
	SetRootComponent(Collision);
	Collision->InitSphereRadius(3.8f); // cm, puck is 7.6 cm in diameter
	Collision->SetCollisionProfileName(TEXT("OverlapAllDynamic")); // we sweep manually; overlap events feed the goal volumes
	Collision->SetGenerateOverlapEvents(true);
	Mesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Mesh"));
	Mesh->SetupAttachment(Collision);
	Mesh->SetCollisionProfileName(TEXT("NoCollision"));
	static ConstructorHelpers::FObjectFinder<UStaticMesh> Cyl(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
	if (Cyl.Succeeded()) { Mesh->SetStaticMesh(Cyl.Object); Mesh->SetRelativeScale3D(FVector(.076f, .076f, .0254f / 2.f)); } // 7.6 cm dia, 2.54 cm thick
}

void ALihlPuck::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	// Substepping: never advance more than SubstepSec at once, at most MaxSubsteps per frame (dt clamped so a hitch cannot explode the sim).
	float Remaining = FMath::Min(DeltaSeconds, SubstepSec * MaxSubsteps);
	while (Remaining > KINDA_SMALL_NUMBER)
	{
		const float Dt = FMath::Min(SubstepSec, Remaining);
		SubStep(Dt);
		Remaining -= Dt;
	}
	SyncActor();
}

void ALihlPuck::SubStep(float Dt)
{
	if (Cooldown > 0.f) Cooldown -= Dt;
	if (Carrier) StepCarried(Dt); else { StepFree(Dt); TryPickup(); }
}

void ALihlPuck::SyncActor()
{
	SetActorLocation(LihlCoords::SimToWorld(X, Y, Z) + FVector(0, 0, Collision->GetScaledSphereRadius()), false, nullptr, ETeleportType::TeleportPhysics);
	// spin about the vertical axis for the visual only
	Mesh->AddLocalRotation(FRotator(0.f, FMath::RadiansToDegrees(Spin) * GetWorld()->GetDeltaSeconds(), 0.f));
}

// ---- carried: game.html lines 676-679. The puck eases onto the blade; the step is capped by PK.SETSTEP so it never teleports. ----
void ALihlPuck::StepCarried(float Dt)
{
	float Bx, By;
	Carrier->GetBladeSim(Bx, By);
	const float K = FMath::Min(1.f, Dt * 26.f);
	float Mx = (Bx - X) * K, My = (By - Y) * K;
	const float Ml = std::hypot(Mx, My);
	if (Ml > FPK::SETSTEP) { Mx *= FPK::SETSTEP / Ml; My *= FPK::SETSTEP / Ml; } // the sim snaps when >9 ft away; we cap instead (no teleport)
	X += Mx; Y += My; Z = 0.f; Vz = 0.f;
	Vx = Carrier->Skate.vx; Vy = Carrier->Skate.vy;
	LastTouch = Carrier; bShot = false;
	// TODO: the sim auto-shoots when the carrier is inside the offensive slot (line 679 shoot(o,0,0,false)); that is skater AI, not puck physics.
}

// ---- free flight: lines 681-683 ----
void ALihlPuck::StepFree(float Dt)
{
	const float Ax = X, Ay = Y;
	// swept move first (blocking geometry), then analytic corrections that mirror the sim
	SweepMove(Vx * Dt, Vy * Dt);
	StepVertical(Dt);
	if (CollidePosts(Ax, Ay)) { bShot = false; Cooldown = .2f; Vz = FMath::Max(Vz, 0.f) + 1.5f; return; } // OFF THE POST (line 685)
	// goal line crossing (lines 686-689): 'inside' means the puck crossed the goal line this substep
	for (int32 Side = 0; Side < 2; ++Side)
	{
		const float Gx = (Side == 0) ? GX : W - GX;
		const bool bLeft = (Side == 0);
		const bool bInside = bLeft ? (Ax >= Gx && X < Gx) : (Ax <= Gx && X > Gx); // t.dir>0 = left goal in the sim
		if (bInside && Y > NY0 && Y < NY1)
		{
			const float Fr = FMath::Abs(X - Ax) > 1e-6f ? (Gx - Ax) / (X - Ax) : 1.f;
			const float Zc = Z; // TODO: interpolate height at the line like the sim (zc=pz0+(z-pz0)*fr), needs pz0 saved before StepVertical
			(void)Fr;
			if (Zc > FPK::BARLO && Zc <= FPK::BAR + .12f) { X = Ax; Vx *= -.45f; Vz = -FMath::Abs(Vz) * .5f - 2.f; Z = FMath::Min(Z, FPK::BAR - .3f); bShot = false; Cooldown = .2f; return; } // OFF THE BAR
			if (Zc > FPK::BAR + .12f) { bShot = false; continue; } // sailed over the net
			PendingGoalSide = Side; // goal; ALihlGameMode confirms via the goal volume overlap or polls PendingGoalSide
		}
	}
	// friction (line 683): exp(-(airborne .03 | shot .2 | pass .22 | free .12)*dt), spin exp(-.5*dt)
	const float F = FMath::Exp(-((Z > 0.f) ? .03f : (bShot ? .2f : IceFrictionPerSec)) * Dt);
	Vx *= F; Vy *= F; Spin *= FMath::Exp(-.5f * Dt);
	// boards (line 684: keepIn with bounce, then straight y clamps at 1 and H-1 with .7 restitution)
	ALihlRink::KeepInRink(X, Y, Vx, Vy, 0.f, true);
	if (Y < 1.f) { Y = 1.f; Vy = FMath::Abs(Vy) * BoardRestitution; }
	if (Y > H - 1.f) { Y = H - 1.f; Vy = -FMath::Abs(Vy) * BoardRestitution; }
}

// Swept sphere through the world. Blocking hits reflect the velocity with BoardRestitution. TODO(verify on compile): SweepSingleByChannel signature / channel choice.
void ALihlPuck::SweepMove(float DX, float DY)
{
	const FVector Start = LihlCoords::SimToWorld(X, Y, Z) + FVector(0, 0, Collision->GetScaledSphereRadius());
	const FVector End = Start + FVector(DX, DY, 0.f) * FtToCm;
	FHitResult Hit;
	FCollisionQueryParams P(SCENE_QUERY_STAT(PuckSweep), false, this);
	if (GetWorld()->SweepSingleByChannel(Hit, Start, End, FQuat::Identity, ECC_WorldStatic, FCollisionShape::MakeSphere(Collision->GetScaledSphereRadius()), P))
	{
		const FVector N = Hit.ImpactNormal.GetSafeNormal2D();
		const float Vn = Vx * N.X + Vy * N.Y;
		const FVector Pos = Start + (End - Start) * Hit.Time;
		float Sx, Sy, Sz; LihlCoords::WorldToSim(Pos, Sx, Sy, Sz);
		X = Sx + N.X * .02f; Y = Sy + N.Y * .02f;                  // stay outside the surface
		if (Vn < 0.f) { Vx -= (1.f + BoardRestitution) * Vn * N.X; Vy -= (1.f + BoardRestitution) * Vn * N.Y; }
	}
	else { X += DX; Y += DY; }
}

// puckVert, game.html line 437-438
void ALihlPuck::StepVertical(float Dt)
{
	if (Z <= 0.f && Vz <= 0.f) { Z = 0.f; Vz = 0.f; return; }
	Z += Vz * Dt - .5f * FPK::G * Dt * Dt;
	Vz -= FPK::G * Dt;
	if (Z <= 0.f)
	{
		Z = 0.f;
		if (Vz < -2.2f) { Vz = -Vz * FPK::E; Vx *= .93f; Vy *= .93f; Spin *= .8f; } // real bounce
		else Vz = 0.f;                                                             // slides
	}
}

// puckPost, game.html line 444-448: swept puck vs a vertical post of radius PK.POST. Ax,Ay = start of the substep, puck already at end.
bool ALihlPuck::CollidePosts(float Ax, float Ay)
{
	if (Z > FPK::BAR) return false;
	for (int32 Side = 0; Side < 2; ++Side)
	{
		const float Gx = (Side == 0) ? GX : W - GX;
		for (float Cy : { NY0, NY1 })
		{
			const float Cx = Gx, R = FPK::POST;
			const float Sx = X - Ax, Sy = Y - Ay, Fx = Ax - Cx, Fy = Ay - Cy, A = Sx * Sx + Sy * Sy;
			float T = 0.f;
			if (Fx * Fx + Fy * Fy >= R * R)
			{
				if (A < 1e-9f) continue;
				const float B = 2.f * (Fx * Sx + Fy * Sy), C = Fx * Fx + Fy * Fy - R * R, D = B * B - 4.f * A * C;
				if (D < 0.f) continue;
				T = (-B - std::sqrt(D)) / (2.f * A);
				if (T < 0.f || T > 1.f) continue;
			}
			const float Hx = Ax + Sx * T, Hy = Ay + Sy * T;
			float Nx = Hx - Cx, Ny = Hy - Cy; const float Dd = std::hypot(Nx, Ny);
			if (Dd < 1e-4f) { const float V = std::hypot(Vx, Vy); if (V < 1e-6f) continue; Nx = -Vx / V; Ny = -Vy / V; } else { Nx /= Dd; Ny /= Dd; }
			const float Vn = Vx * Nx + Vy * Ny;
			if (Vn >= 0.f) continue;
			Vx -= (1.f + PostRestitution) * Vn * Nx; Vy -= (1.f + PostRestitution) * Vn * Ny;
			X = Cx + Nx * (R + .02f); Y = Cy + Ny * (R + .02f);
			return true;
		}
	}
	return false;
}

// POSSESSION ONLY BY STICK CONTACT (game.html line 680 hyp(cx-puck.x,cy-puck.y)<PK.CONTACT). Reception quality rolls (clean/bobble/deflect) are NOT ported yet.
void ALihlPuck::TryPickup()
{
	if (Cooldown > 0.f || Z > FPK::STICK) return;
	ALihlGameMode* GM = GetWorld()->GetAuthGameMode<ALihlGameMode>();
	if (!GM) return;
	for (ALihlSkater* S : GM->Skaters)
	{
		if (!S || S->IsStunned()) continue;
		float Bx, By; S->GetBladeSim(Bx, By);
		if (std::hypot(Bx - X, By - Y) < FPK::CONTACT) { Carrier = S; LastTouch = S; bShot = false; return; }
	}
}

void ALihlPuck::Release(float Vx_, float Vy_, float Vz_, bool bIsShot, float InSpin)
{
	// lines 462 / 496: puck.owner=null; velocity set; sid++; cool .35 (shot) or .3 (pass). The puck stays at the blade (the sim offsets it 1.6-4.2 ft along the aim; we do not).
	LastTouch = Carrier; Carrier = nullptr;
	Vx = Vx_; Vy = Vy_; Vz = Vz_; Z = (Vz_ > 0.f) ? .05f : 0.f; bShot = bIsShot; Spin = InSpin;
	Cooldown = bIsShot ? .35f : .3f; ++ShotId;
}

void ALihlPuck::ResetTo(float X_, float Y_)
{
	X = X_; Y = Y_; Z = 0.f; Vx = Vy = Vz = Spin = 0.f; Carrier = nullptr; bShot = false; PendingGoalSide = -1; Cooldown = 0.f;
	SyncActor();
}
