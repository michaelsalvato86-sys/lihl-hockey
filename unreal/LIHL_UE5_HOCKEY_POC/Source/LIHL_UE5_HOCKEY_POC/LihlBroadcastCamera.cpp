// LihlBroadcastCamera.cpp  NOT COMPILED, NOT RUN. See header for the r3d.js source lines.
#include "LihlBroadcastCamera.h"
#include "Camera/CameraComponent.h"
#include "Kismet/GameplayStatics.h"
#include "EngineUtils.h"
#include "LihlCoords.h"
#include "LihlPuck.h"

using namespace Lihl;

ALihlBroadcastCamera::ALihlBroadcastCamera()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.TickGroup = TG_PostUpdateWork;
	Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
	SetRootComponent(Camera);
	Camera->SetFieldOfView(FovDeg);
}

void ALihlBroadcastCamera::BeginPlay()
{
	Super::BeginPlay();
	if (APlayerController* PC = GetWorld()->GetFirstPlayerController()) PC->SetViewTarget(this);
}

void ALihlBroadcastCamera::Tick(float Dt)
{
	Super::Tick(Dt);
	ALihlPuck* Puck = nullptr;
	for (TActorIterator<ALihlPuck> It(GetWorld()); It; ++It) { Puck = *It; break; }
	if (!Puck) return;
	// lead: look ahead of the puck by .2 * its x velocity (line 241, anticipation term omitted), vy*.1 across
	const float Tx = Clamp(Puck->X - W * .5f + Clamp(Puck->Vx * .2f, -14.f, 14.f), -84.f, 84.f);
	const float Tz = Clamp(Puck->Y - H * .5f + Puck->Vy * .1f, -34.f, 34.f);
	const float Ex = Tx - Cx, Ez = Tz - Cz;
	const float Fx = Sign(Ex) * std::max(0.f, std::fabs(Ex) - 1.1f), Fz = Sign(Ez) * std::max(0.f, std::fabs(Ez) - .7f);
	const float Rt = 2.8f + std::min(3.2f, std::hypot(Ex, Ez) / 8.f);
	Cx += Fx * std::min(1.f, Dt * Rt); Cz += Fz * std::min(1.f, Dt * Rt);
	const float Spd = std::min(1.f, std::hypot(Puck->Vx, Puck->Vy) / 90.f);
	const float Hgt = BaseHeightFt + Spd * 4.f, Dist = BaseDistFt + Spd * 8.f;
	// r3d.js z (across) == sim y - H/2; our world Y is (sim y - MY) so the offset between H/2 and MY (.0 ft: 42.5 == 85/2) is zero.
	const FVector Pos(Cx * FtToCm, (Cz + Dist) * FtToCm, Hgt * FtToCm);
	SetActorLocation(Pos);
	SetActorRotation((FVector(Cx * FtToCm, Cz * FtToCm, 0.f) - Pos).Rotation());
}
