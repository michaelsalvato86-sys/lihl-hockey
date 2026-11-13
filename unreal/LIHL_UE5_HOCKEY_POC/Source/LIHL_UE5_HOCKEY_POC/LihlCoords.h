// LihlCoords.h  NOT COMPILED. Sim feet <-> Unreal centimeters. Rink centre = world origin (see LihlSimMath.h header comment).
#pragma once
#include "CoreMinimal.h"
#include "LihlSimMath.h"

namespace LihlCoords
{
	/** sim (x along rink 0..200, y across 0..85, z height ft) -> Unreal world cm, centre of rink at origin. */
	inline FVector SimToWorld(float X, float Y, float Z = 0.f)
	{
		return FVector((X - Lihl::W * .5f) * Lihl::FtToCm, (Y - Lihl::MY) * Lihl::FtToCm, Z * Lihl::FtToCm);
	}
	inline void WorldToSim(const FVector& P, float& X, float& Y, float& Z)
	{
		X = P.X / Lihl::FtToCm + Lihl::W * .5f; Y = P.Y / Lihl::FtToCm + Lihl::MY; Z = P.Z / Lihl::FtToCm;
	}
}
