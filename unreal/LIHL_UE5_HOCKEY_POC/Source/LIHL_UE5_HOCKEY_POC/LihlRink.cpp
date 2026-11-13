// LihlRink.cpp  NOT COMPILED, NOT RUN.
#include "LihlRink.h"
#include "Components/BoxComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "UObject/ConstructorHelpers.h"
#include "LihlCoords.h"
#include "LihlPuck.h"
#include "LihlGameMode.h"

using namespace Lihl;

ALihlRink::ALihlRink()
{
	PrimaryActorTick.bCanEverTick = false;
	USceneComponent* Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	SetRootComponent(Root);
	IceSurface = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("IceSurface"));
	IceSurface->SetupAttachment(Root);
	GoalVolumeLeft = CreateDefaultSubobject<UBoxComponent>(TEXT("GoalVolumeLeft"));
	GoalVolumeRight = CreateDefaultSubobject<UBoxComponent>(TEXT("GoalVolumeRight"));
	GoalVolumeLeft->SetupAttachment(Root);
	GoalVolumeRight->SetupAttachment(Root);
	static ConstructorHelpers::FObjectFinder<UStaticMesh> CubeFinder(TEXT("/Engine/BasicShapes/Cube.Cube"));
	static ConstructorHelpers::FObjectFinder<UStaticMesh> CylFinder(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
	if (CubeFinder.Succeeded()) BoxMesh = CubeFinder.Object;
	if (CylFinder.Succeeded()) CylinderMesh = CylFinder.Object;
}

void ALihlRink::OnConstruction(const FTransform& Transform)
{
	Super::OnConstruction(Transform);
	if (!bBuilt) { bBuilt = true; BuildRink(); } // TODO(verify on compile): OnConstruction runs on every move in the editor; guard prevents duplicate components
}

UStaticMeshComponent* ALihlRink::AddBox(const FName Name, const FVector& CenterCm, const FVector& SizeCm)
{
	UStaticMeshComponent* C = NewObject<UStaticMeshComponent>(this, Name);
	C->SetStaticMesh(BoxMesh);
	C->SetupAttachment(GetRootComponent());
	C->SetRelativeLocation(CenterCm);
	C->SetRelativeScale3D(SizeCm / 100.f); // the engine cube is 100 cm
	C->SetCollisionProfileName(TEXT("BlockAll"));
	C->RegisterComponent();
	return C;
}

void ALihlRink::BuildRink()
{
	const float WcM = W * FtToCm, HcM = H * FtToCm;
	IceSurface->SetStaticMesh(BoxMesh);
	IceSurface->SetRelativeLocation(FVector(0, 0, -5.f));
	IceSurface->SetRelativeScale3D(FVector(WcM / 100.f, HcM / 100.f, .1f));
	IceSurface->SetCollisionProfileName(TEXT("BlockAll"));

	// Straight boards between the corner arcs. TODO: corner arcs (8 box segments along the R=12 ft arc at each corner).
	const float R = 12.f * FtToCm, T = 10.f, BH = BoardHeightCm;
	AddBox(TEXT("BoardNorth"), FVector(0, HcM * .5f + T * .5f, BH * .5f), FVector(WcM - 2 * R, T, BH));
	AddBox(TEXT("BoardSouth"), FVector(0, -HcM * .5f - T * .5f, BH * .5f), FVector(WcM - 2 * R, T, BH));
	AddBox(TEXT("BoardEast"), FVector(WcM * .5f + T * .5f, 0, BH * .5f), FVector(T, HcM - 2 * R, BH));
	AddBox(TEXT("BoardWest"), FVector(-WcM * .5f - T * .5f, 0, BH * .5f), FVector(T, HcM - 2 * R, BH));

	// Goals: opening on each goal line, y from NY0..NY1 (10 ft), 4 ft high. Left goal is defended by team 0.
	const float OpenW = (NY1 - NY0) * FtToCm, BarH = FPK::BAR * FtToCm, Depth = FPK::NETD * FtToCm;
	for (int32 Side = 0; Side < 2; ++Side)
	{
		const float GoalX = (Side == 0 ? GX : W - GX);
		const float Dir = (Side == 0) ? -1.f : 1.f; // the net extends behind the goal line (away from centre ice)
		const FVector Opening = LihlCoords::SimToWorld(GoalX, MY, 0.f);
		UBoxComponent* Vol = (Side == 0) ? GoalVolumeLeft : GoalVolumeRight;
		Vol->SetBoxExtent(FVector(Depth * .5f, OpenW * .5f, BarH * .5f));
		Vol->SetRelativeLocation(Opening + FVector(Dir * Depth * .5f, 0, BarH * .5f));
		Vol->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
		Vol->SetGenerateOverlapEvents(true);
		Vol->OnComponentBeginOverlap.AddUniqueDynamic(this, &ALihlRink::OnGoalVolumeOverlap);
		// Posts (visual only; the puck uses the analytic swept post test like game.html puckPost line 444). Engine cylinder: 100 cm dia x 200 cm tall.
		for (float Y : { NY0, NY1 })
		{
			UStaticMeshComponent* Post = NewObject<UStaticMeshComponent>(this);
			Post->SetStaticMesh(CylinderMesh);
			Post->SetupAttachment(GetRootComponent());
			Post->SetRelativeLocation(LihlCoords::SimToWorld(GoalX, Y, FPK::BAR * .5f));
			const float D = FPK::POST * 2.f * FtToCm / 100.f;
			Post->SetRelativeScale3D(FVector(D, D, BarH / 200.f));
			Post->SetCollisionProfileName(TEXT("NoCollision"));
			Post->RegisterComponent();
		}
	}
}

// Port of keepIn(o,pad,bounce), game.html line 559: rounded rectangle, corner radius R=12 ft.
bool ALihlRink::KeepInRink(float& X, float& Y, float& Vx, float& Vy, float Pad, bool bBounce)
{
	const float R = 12.f;
	const float Cx = Clamp(X, R, W - R), Cy = Clamp(Y, R, H - R);
	const float Dx = X - Cx, Dy = Y - Cy, D = std::hypot(Dx, Dy);
	if (D > R - Pad && D > .001f)
	{
		const float K = (R - Pad) / D;
		X = Cx + Dx * K; Y = Cy + Dy * K;
		if (bBounce)
		{
			const float Nx = Dx / D, Ny = Dy / D, Vn = Vx * Nx + Vy * Ny;
			if (Vn > 0.f) { Vx -= 1.7f * Vn * Nx; Vy -= 1.7f * Vn * Ny; }
		}
		return true;
	}
	return false;
}

void ALihlRink::OnGoalVolumeOverlap(UPrimitiveComponent* Overlapped, AActor* Other, UPrimitiveComponent*, int32, bool, const FHitResult&)
{
	ALihlPuck* Puck = Cast<ALihlPuck>(Other);
	if (!Puck) return;
	const int32 DefendingTeam = (Overlapped == GoalVolumeLeft) ? 0 : 1;
	if (ALihlGameMode* GM = GetWorld()->GetAuthGameMode<ALihlGameMode>()) GM->NotifyPuckInGoalVolume(Puck, DefendingTeam);
}
