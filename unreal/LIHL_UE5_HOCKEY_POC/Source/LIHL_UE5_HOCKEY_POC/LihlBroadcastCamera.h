// LihlBroadcastCamera.h  NOT COMPILED, NOT RUN.
// Side broadcast camera following the puck. Port of the web game's default follow camera, r3d.js lines 240-244:
//   target tx=clamp(fp.x-W/2+clamp(lead,-14,14),-84,84), tz=clamp(fp.y-H/2+lead,-34,34), deadband 1.1 / .7 ft, rate rt=2.8+min(3.2,dist/8)
//   (1.8 right after a long puck jump), then position = (cx, hgt, cz+dist) with hgt=23+spd*4, dist=38+spd*8 (landscape), FOV 40, lookAt(cx, 0, cz).
// In r3d.js world coordinates (x along rink from centre, z across, y up) all in feet; in Unreal the same numbers map to X, Y, Z in cm via x30.48.
// Camera shake, replay, goal-celebration camera (line 246) and the other views (v, n, b) are NOT ported.
#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "LihlBroadcastCamera.generated.h"

class UCameraComponent;
class ALihlPuck;

UCLASS()
class LIHL_UE5_HOCKEY_POC_API ALihlBroadcastCamera : public AActor
{
	GENERATED_BODY()
public:
	ALihlBroadcastCamera();
	virtual void Tick(float DeltaSeconds) override;
	virtual void BeginPlay() override;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "LIHL") TObjectPtr<UCameraComponent> Camera;
	UPROPERTY(EditAnywhere, Category = "LIHL") float BaseHeightFt = 23.f, BaseDistFt = 38.f, FovDeg = 40.f;
	float Cx = 0.f, Cz = 0.f; // smoothed focus, feet from rink centre (R.cx, R.cz in r3d.js)
};
