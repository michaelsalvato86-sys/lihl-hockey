// LihlRink.h  NOT COMPILED, NOT RUN. Rink actor: dimensions from the sim (game.html line 284: W=200, H=85, GX=11, NY=[37.5,47.5], MY=42.5).
// Plan (what BuildRink() creates, all procedural so no art assets are needed for the POC):
//   - Ice plane: box 200 x 85 ft, top face at Z=0.
//   - Boards: four straight sides (this scaffold) plus four corner arcs of radius 12 ft (game.html keepIn(), line 559: R=12; arcs are a TODO),
//     42 in high (the sim has no board height, boards only constrain x/y). Collision profile BlockAll.
//   - Goal lines at x = GX and W-GX (11 ft from the end boards), centre red line at W/2, blue lines at x = 75 and 125 (game.html draw2D lines 763-764).
//   - Faceoff circles r=15 at (31,22) (31,63) (169,22) (169,63) and centre (100,42.5) (draw2D line 765). TODO: dots, hashmarks, creases r=6 (line 766).
//   - Goals: two posts (radius PK.POST = .3 ft) at y=NY0 and NY1 on each goal line, crossbar at 4 ft, net NETD=4 ft deep behind the line,
//     plus a UBoxComponent goal volume that fires an overlap event (confirmed by the swept crossing test in ALihlPuck).
//   - Markings: NOT implemented; planned as a decal actor with a line texture (TODO).
#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "LihlRink.generated.h"

class UBoxComponent;
class UStaticMeshComponent;
class UStaticMesh;

UCLASS()
class LIHL_UE5_HOCKEY_POC_API ALihlRink : public AActor
{
	GENERATED_BODY()
public:
	ALihlRink();

	/** Team 0 (home) defends the goal at sim x = GX (left); team 1 at W-GX. Matches mkTeam: side>0 -> ownGX=GX (game.html line 316). */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "LIHL") TObjectPtr<UBoxComponent> GoalVolumeLeft;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "LIHL") TObjectPtr<UBoxComponent> GoalVolumeRight;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "LIHL") TObjectPtr<UStaticMeshComponent> IceSurface;
	/** /Engine/BasicShapes/Cube and Cylinder are used for every procedural shape. */
	UPROPERTY(EditAnywhere, Category = "LIHL") TObjectPtr<UStaticMesh> BoxMesh;
	UPROPERTY(EditAnywhere, Category = "LIHL") TObjectPtr<UStaticMesh> CylinderMesh;
	UPROPERTY(EditAnywhere, Category = "LIHL") float BoardHeightCm = 107.f;

	/** Keeps a sim-space point inside the rounded rink (port of keepIn(), game.html line 559). Returns true if it touched a board. */
	static bool KeepInRink(float& X, float& Y, float& Vx, float& Vy, float Pad, bool bBounce);

	/** Goal volume overlap; the GameMode decides whether it counts (the puck must have crossed the line under the bar). */
	UFUNCTION() void OnGoalVolumeOverlap(UPrimitiveComponent* Overlapped, AActor* Other, UPrimitiveComponent* OtherComp, int32 BodyIndex, bool bFromSweep, const FHitResult& Sweep);

protected:
	virtual void OnConstruction(const FTransform& Transform) override;
	void BuildRink();
	UStaticMeshComponent* AddBox(const FName Name, const FVector& CenterCm, const FVector& SizeCm);
	bool bBuilt = false;
};
