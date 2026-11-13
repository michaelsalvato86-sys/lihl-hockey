// LihlPuck.h  NOT COMPILED, NOT RUN.
// Physical puck. Design rules (from the Mega Pass 10 brief):
//   1. SUBSTEPPED SWEPT MOVEMENT: Tick splits dt into substeps of at most SubstepSec and moves the body with a swept sphere test each substep, so a
//      fast slap shot (up to ~150 ft/s = 4570 cm/s) cannot tunnel through a post or the boards.
//   2. NO TELEPORTING: a carried puck eases toward the stick blade with a capped step (PK.SETSTEP = 2.5 ft, game.html line 675); free movement is always swept.
//   3. POSSESSION ONLY BY STICK CONTACT: the puck becomes owned only when a skater's blade (socket "StickBlade" or the sim blade offset) is within
//      PK.CONTACT = .9 ft of the puck, the puck is below PK.STICK = 3 ft and the post-release cooldown has expired (game.html lines 680, 458-462 puck.cool).
//   4. Friction, restitution, spin and the vertical bounce are ported from game.html lines 432-447 and 681-683 (see ALihlPuck::StepFree).
// Simulation state is kept in SIM UNITS (feet, ft/s) and mirrored to the actor transform each tick (LihlCoords.h).
#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "LihlSimMath.h"
#include "LihlPuck.generated.h"

class UStaticMeshComponent;
class USphereComponent;
class ALihlSkater;

UCLASS()
class LIHL_UE5_HOCKEY_POC_API ALihlPuck : public AActor
{
	GENERATED_BODY()
public:
	ALihlPuck();
	virtual void Tick(float DeltaSeconds) override;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "LIHL") TObjectPtr<USphereComponent> Collision; // swept body, radius ~ half puck thickness
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "LIHL") TObjectPtr<UStaticMeshComponent> Mesh; // cylinder 3 in dia x 1 in
	UPROPERTY(EditAnywhere, Category = "LIHL|Physics") float SubstepSec = 1.f / 240.f;
	UPROPERTY(EditAnywhere, Category = "LIHL|Physics") int32 MaxSubsteps = 16;
	UPROPERTY(EditAnywhere, Category = "LIHL|Physics") float BoardRestitution = .7f;  // keepIn() reflects with 1.7*vn, i.e. e=.7 (game.html line 559)
	UPROPERTY(EditAnywhere, Category = "LIHL|Physics") float PostRestitution = .55f;  // puckPost(...,.55) game.html line 685
	UPROPERTY(EditAnywhere, Category = "LIHL|Physics") float IceFrictionPerSec = .12f; // free puck: exp(-.12*dt) (line 683); .2 shot, .22 pass, .03 airborne

	// ---- sim-space state (feet, ft/s). Z is height above the ice. ----
	float X = Lihl::W * .5f, Y = Lihl::MY, Z = 0.f;
	float Vx = 0.f, Vy = 0.f, Vz = 0.f, Spin = 0.f;
	float Cooldown = 0.f;              // puck.cool: seconds before anybody may pick it up
	bool bShot = false;                // puck.shot != null (affects friction and goalie logic)
	int32 ShotId = 0;                  // puck.sid, increments on every release (goalie re-arms reaction)

	UPROPERTY(BlueprintReadOnly, Category = "LIHL") TObjectPtr<ALihlSkater> Carrier; // puck.owner
	UPROPERTY(BlueprintReadOnly, Category = "LIHL") TObjectPtr<ALihlSkater> LastTouch; // puck.last

	/** Release the puck from the blade (shot or pass). Speeds in ft/s. Does not move the puck (no teleport). */
	void Release(float Vx_, float Vy_, float Vz_, bool bIsShot, float InSpin);
	/** Place the puck for a faceoff (the only place allowed to set position directly; this is a stoppage reset like setupFaceoff, game.html line 401). */
	void ResetTo(float X_, float Y_);

	/** Set by the swept crossing test when the puck crossed a goal line under the bar this substep: 0 = left goal (team 0 defends), 1 = right, -1 none. */
	int32 PendingGoalSide = -1;

protected:
	void SubStep(float Dt);
	void StepCarried(float Dt);
	void StepFree(float Dt);
	void StepVertical(float Dt);      // port of puckVert (line 437)
	bool CollidePosts(float Ax, float Ay);  // port of puckPost (line 444), analytic swept circle
	void TryPickup();
	void SyncActor();
	void SweepMove(float DX, float DY);   // swept sphere through the world (boards, nets, other blockers)
};
