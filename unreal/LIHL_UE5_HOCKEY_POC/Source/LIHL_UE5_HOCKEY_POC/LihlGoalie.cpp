// LihlGoalie.cpp  NOT COMPILED, NOT RUN. See LihlGoalie.h.
#include "LihlGoalie.h"
#include "Components/CapsuleComponent.h"
#include "EngineUtils.h"
#include "LihlCoords.h"
#include "LihlPuck.h"

using namespace Lihl;

ALihlGoalie::ALihlGoalie()
{
	PrimaryActorTick.bCanEverTick = true;
	Body = CreateDefaultSubobject<UCapsuleComponent>(TEXT("Body"));
	SetRootComponent(Body);
	Body->InitCapsuleSize(1.2f * FtToCm, 3.f * FtToCm);
	Body->SetCollisionProfileName(TEXT("BlockAllDynamic"));
}

ALihlPuck* ALihlGoalie::FindPuck() const
{
	for (TActorIterator<ALihlPuck> It(GetWorld()); It; ++It) return *It;
	return nullptr;
}

FGoalieWorld ALihlGoalie::BuildWorld(const ALihlPuck* P) const
{
	FGoalieWorld W_;
	W_.OwnGX = (TeamIndex == 0) ? GX : W - GX;
	W_.Dir = (TeamIndex == 0) ? 1.f : -1.f;    // t.dir: +1 for the left-goal team
	W_.DiffGk = DifficultyGk;
	if (P)
	{
		W_.PuckX = P->X; W_.PuckY = P->Y; W_.PuckVx = P->Vx; W_.PuckVy = P->Vy; W_.bShotInFlight = P->bShot;
		// TODO: windup detection (opponent skaters mid-shot within 75 ft, lines 737-738) and carrier lead (line 747) need the skater list from the GameMode.
	}
	return W_;
}

void ALihlGoalie::Tick(float Dt)
{
	Super::Tick(Dt);
	ALihlPuck* Puck = FindPuck();
	if (!Puck) return;
	const FGoalieWorld Wd = BuildWorld(Puck);
	// line 739: a new shot id re-arms the reaction delay; line 740 counts timers down
	if (Puck->ShotId != State.ShotId) { State.ShotId = Puck->ShotId; State.react = GoalieReactDelay(State.Gl, Wd.bWindup); }
	State.react = FMath::Max(0.f, State.react - Dt);
	State.recov = FMath::Max(0.f, State.recov - Dt);
	const float Ty = GoalieTargetY(State, Wd);
	GoalieMove(State, Wd, Ty, Dt);
	SetActorLocation(LihlCoords::SimToWorld(State.x, State.y, 0.f) + FVector(0, 0, Body->GetScaledCapsuleHalfHeight()), true);
	SetActorRotation(FRotator(0.f, (TeamIndex == 0) ? 0.f : 180.f, 0.f)); // faces centre ice
	if (Puck->PendingGoalSide == TeamIndex) TryGoalLineSave(Puck);
}

void ALihlGoalie::TryGoalLineSave(ALihlPuck* Puck)
{
	// Probability and kind from the ported formulas. Shot distance/angle inputs use the release data the sim stores (puck.sd, puck.sy, puck.ss): TODO store them in ALihlPuck::Release.
	const float Dy = FMath::Abs(Puck->Y - State.y);
	const float Speed = std::hypot(Puck->Vx, Puck->Vy);
	const float Ps = SaveProbability(State.Gl, .6f /*TODO shooter shot attr*/, 25.f /*TODO puck.sd*/, Puck->Y - MY, Speed, 0 /*TODO screen count*/, false, DifficultySave, State.recov > 0.f, Dy);
	if (FMath::FRand() < Ps)
	{
		const float Hv = GoalieHV(Puck->Z, Puck->ShotId);
		const ESaveKind K = SelectSave(Hv, Dy, (Puck->Y - State.y) * ((TeamIndex == 0) ? -1.f : 1.f) > 0.f);
		State.recov = (K == ESaveKind::Butterfly || K == ESaveKind::Pad) ? .55f : .2f;
		State.react = .08f;
		Puck->PendingGoalSide = -1;
		OnSaveEvent.Broadcast(FName(TEXT("save")), (uint8)K, Puck->Z);
		// TODO: rebound / freeze (lines 698-706): puck kicks away with kind-specific speed, or the goalie covers it.
		Puck->Vx = -Puck->Vx * .3f;
	}
}
