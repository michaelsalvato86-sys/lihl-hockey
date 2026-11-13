// LihlSkater.h  NOT COMPILED, NOT RUN.
// ACharacter whose velocity is owned by the SKATE2 port in LihlSimMath.h (Lihl::SkateStep, from game.html lines 561-592).
// How the sim math drives the engine: each Tick we build a FSkateInput (desired direction from input or AI, attributes from the DataTable row),
// run SkateStep in sim feet, then hand the resulting velocity to UCharacterMovementComponent (MOVE_Flying, no gravity, no braking, no friction) so
// the capsule is swept against boards/nets/other skaters by the engine. Position clamps match game.html line 664 (x 7..W-7, y 2.5..H-2.5).
// Skating features carried over: edge-radius turning, grip budget (sideways slip removal), hockey stop latch, pivot, backward skating, momentum
// (acceleration curve and carve drag), stride phase for animation (ph), edge/stp/spray/xo outputs for the AnimInstance.
#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "LihlSimMath.h"
#include "Data/LihlDataRows.h"
#include "LihlSkater.generated.h"

class UInputAction;
class UInputMappingContext;
class ALihlPuck;
struct FInputActionValue;

UCLASS()
class LIHL_UE5_HOCKEY_POC_API ALihlSkater : public ACharacter
{
	GENERATED_BODY()
public:
	ALihlSkater();
	virtual void Tick(float DeltaSeconds) override;
	virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;
	virtual void BeginPlay() override;

	// ---- Enhanced Input assets (create in the editor, assign on the Blueprint child; see README) ----
	UPROPERTY(EditAnywhere, Category = "LIHL|Input") TObjectPtr<UInputMappingContext> MappingContext;
	UPROPERTY(EditAnywhere, Category = "LIHL|Input") TObjectPtr<UInputAction> MoveAction;   // Axis2D
	UPROPERTY(EditAnywhere, Category = "LIHL|Input") TObjectPtr<UInputAction> ShootAction;  // Digital
	UPROPERTY(EditAnywhere, Category = "LIHL|Input") TObjectPtr<UInputAction> PassAction;   // Digital

	// ---- state exposed to the AnimInstance (sim names in comments) ----
	Lihl::FSkateState Skate;
	float SimX = Lihl::W * .5f, SimY = Lihl::MY;      // feet
	UPROPERTY(BlueprintReadOnly, Category = "LIHL") float EdgeLean = 0.f;     // p.edge
	UPROPERTY(BlueprintReadOnly, Category = "LIHL") float StopAmount = 0.f;   // p.stp
	UPROPERTY(BlueprintReadOnly, Category = "LIHL") float StridePhase = 0.f;  // p.ph
	UPROPERTY(BlueprintReadOnly, Category = "LIHL") bool bSkatingBackward = false;
	UPROPERTY(BlueprintReadOnly, Category = "LIHL") bool bIceSpray = false;

	// ---- attributes (from FLihlPlayerRow; defaults = a mid-rated skater) ----
	UPROPERTY(EditAnywhere, Category = "LIHL") int32 TeamIndex = 0;   // 0 home, 1 away
	UPROPERTY(EditAnywhere, Category = "LIHL") float SimSpd = .6f, SimShot = .6f, SimPass = .6f, SimChk = .6f, SimDef = .6f;
	UPROPERTY(EditAnywhere, Category = "LIHL") float Stamina = 1.f;   // p.st, drains in Tick as in line 664
	UPROPERTY(EditAnywhere, Category = "LIHL") bool bIsControlled = false; // p.isCtl (human-controlled skater gets agility and speed bonuses)
	UPROPERTY(EditAnywhere, Category = "LIHL") float DifficultySpd = 1.f;  // DIFFK[difficulty].spd (line 611)

	void ApplyPlayerRow(const FLihlPlayerRow& Row);
	void SetDesiredDirection(const FVector2D& Dir) { Desired = Dir; }   // sim axes: x along rink, y across; magnitude 0..1
	bool IsStunned() const { return StunSec > 0.f; }
	void Stun(float Sec) { StunSec = FMath::Max(StunSec, Sec); }

	/** Blade tip in SIM feet: game.html line 678 tx=o.x+cos(fa)*4-sin(fa)*sw, sw=sin(clock*7+slot)*min(1.2,speed/28). TODO: use socket "StickBlade" when the mesh has one. */
	void GetBladeSim(float& OutX, float& OutY) const;
	/** Minimal shot/pass: releases the puck along facing. Real shoot() (game.html 458-466: kinds, aim error, one-timers) is NOT ported. */
	void ReleasePuck(float SpeedFtS, float LiftFtS, bool bIsShot);

protected:
	void OnMove(const FInputActionValue& Value);
	void OnMoveReleased(const FInputActionValue& Value);
	void OnShoot();
	void OnPass();
	FVector2D Desired = FVector2D::ZeroVector;
	float StunSec = 0.f, BurstSec = 0.f, Clock = 0.f;
	int32 Slot = 0;
	ALihlPuck* FindPuck() const;
};
