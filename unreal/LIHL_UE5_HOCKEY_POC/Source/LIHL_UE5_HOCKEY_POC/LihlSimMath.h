// LihlSimMath.h
// NOT COMPILED, NOT EXECUTED (Unreal Engine and a C++ compiler are not installed on the authoring PC).
//
// Engine-independent (plain C++17, no UE types) port of the web game's sim math from game.html (branch p10-poc, file game.html).
// Keeping it free of UE types means it can be unit-tested outside Unreal later: compile it with any C++17 compiler and compare against
// the JS sim by feeding the same inputs (see README "Parity test idea").
//
// UNITS: sim units are FEET and SECONDS (rink 200 x 85 ft). Unreal is centimeters; convert only at the boundary with LihlFtToCm / LihlCmToFt.
// AXES: sim x = along the rink (0..200), sim y = across (0..85), sim z = puck height above ice (ft). In Unreal we map
//   UE.X = (sim.x - W/2) * 30.48, UE.Y = (sim.y - MY) * 30.48, UE.Z = sim.z * 30.48
// so the rink centre is the world origin. UE yaw (degrees, X toward Y) equals sim facing fa (radians, atan2(y, x)) so yaw = fa * 180/PI.
#pragma once

#include <algorithm>
#include <cmath>
#include <cstdint>

namespace Lihl
{
// ---- game.html line 284: const SL=[...],W=200,H=85,GX=11,NY=[37.5,47.5],MY=42.5
constexpr float W = 200.f, H = 85.f, GX = 11.f, NY0 = 37.5f, NY1 = 47.5f, MY = 42.5f;
constexpr float FtToCm = 30.48f;
constexpr float PI_F = 3.14159265358979f;

// ---- game.html line 432: const PK={G:32.2,E:.38,BAR:4,BARLO:3.7,POST:.3,STICK:3,NETD:4,LANE:.55,RCV:1.5,SETSTEP:2.5,CONTACT:.9}
struct FPK
{
	static constexpr float G = 32.2f;      // gravity ft/s^2
	static constexpr float E = .38f;       // vertical restitution (ice bounce)
	static constexpr float BAR = 4.f;      // crossbar height ft
	static constexpr float BARLO = 3.7f;   // bar underside
	static constexpr float POST = .3f;     // post radius ft
	static constexpr float STICK = 3.f;    // puck above this height is above sticks
	static constexpr float NETD = 4.f;     // net depth ft
	static constexpr float LANE = .55f;    // saucer pass clears sticks above this
	static constexpr float RCV = 1.5f;     // receiver can only take pucks below this
	static constexpr float SETSTEP = 2.5f; // max swept step of the cushion (no teleport)
	static constexpr float CONTACT = .9f;  // blade pickup radius ft
};
// ---- game.html line 734: const GK_ACC=480,GK_POST=4.2;
constexpr float GK_ACC = 480.f, GK_POST = 4.2f;

inline float Clamp(float v, float a, float b) { return std::max(a, std::min(b, v)); }
inline float Sign(float v) { return v > 0.f ? 1.f : (v < 0.f ? -1.f : 0.f); } // JS Math.sign (0 -> 0)
// game.html line 560: function wrapA(a){return((a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI}
inline float WrapA(float a)
{
	const float T = 2.f * PI_F;
	// JS % keeps the sign of the dividend, same as std::fmod
	return std::fmod(std::fmod(a + PI_F, T) + T, T) - PI_F;
}

// =====================================================================================================================================
// SKATING (game.html lines 561-592, function skate(p,dt,mx), branch SKATE2=true)
// =====================================================================================================================================
struct FSkateState
{
	float vx = 0.f, vy = 0.f;   // ft/s
	float fa = 0.f;             // facing, radians
	float stp = 0.f;            // 0..1 hockey stop amount (smoothed)
	float edge = 0.f;           // -1..1 edge lean (animation)
	float ph = 0.f;             // stride phase
	float turn = 0.f;           // yaw rate rad/s
	float acc01 = 0.f;          // 0..1 acceleration (animation)
	bool bStopOn = false;       // p.stpOn latch
	bool bStopBack = false;     // p.stBk
	float StopSide = 1.f;       // p.stS
	bool bBack = false;         // p.back, skating backward
	bool bCrossover = false;    // p.xo
	bool bSpray = false;        // p.spray
};
struct FSkateInput
{
	float dvx = 0.f, dvy = 0.f; // desired direction, magnitude 0..1 (p.dvx, p.dvy)
	float SpdAttr = .5f;        // p.spd (0..1), from Players.csv SimSpd
	bool bIsControlled = false; // p.isCtl
	bool bHasPuck = false;      // puck.owner === p
	float MaxSpeed = 40.f;      // mx, ft/s (see ComputeMaxSpeed)
};

// game.html line 663: const mx=(24+20*p.spd)*dkf(p.team,'spd')*(.78+.22*(p.st===undefined?1:p.st))*(puck.owner===p?.97:1)*(p.burst>0?(p.isCtl?1.35:1.16):1)*(p.isCtl?1.06:1)*(p.stun>0?.25:1)
inline float ComputeMaxSpeed(float Spd, float DiffSpd, float Stamina, bool bHasPuck, bool bBurst, bool bIsCtl, bool bStunned)
{
	return (24.f + 20.f * Spd) * DiffSpd * (.78f + .22f * Stamina) * (bHasPuck ? .97f : 1.f) * (bBurst ? (bIsCtl ? 1.35f : 1.16f) : 1.f) * (bIsCtl ? 1.06f : 1.f) * (bStunned ? .25f : 1.f);
}

// One skating tick. Faithful port of skate() SKATE2 branch. Position integration is done by the caller (game.html line 664:
// p.x=clamp(p.x+p.vx*dt,7,W-7); p.y=clamp(p.y+p.vy*dt,2.5,H-2.5)); stamina drain is line 664 too.
inline void SkateStep(FSkateState& s, const FSkateInput& in, float dt)
{
	const float mx = in.MaxSpeed;
	const float dx = in.dvx, dy = in.dvy;
	const float des = std::min(1.f, std::hypot(dx, dy)), sp = std::hypot(s.vx, s.vy);
	// line 565: ag=(.7+.6*p.spd)*(p.isCtl?1.22:1)
	const float ag = (.7f + .6f * in.SpdAttr) * (in.bIsControlled ? 1.22f : 1.f);
	float diff = 0.f, al = 1.f;
	bool back = false;
	s.acc01 = 0.f; s.turn = 0.f;
	float vf = s.vx * std::cos(s.fa) + s.vy * std::sin(s.fa);
	const float vf0 = vf;
	float dT = 0.f;
	if (des > .08f)
	{
		diff = WrapA(std::atan2(dy, dx) - s.fa);
		al = std::cos(diff);
		if (sp > 1.f) dT = WrapA(std::atan2(dy, dx) - std::atan2(s.vy, s.vx));
	}
	// hockey stop latch (lines 569-571): judged against TRAVEL direction
	if (!s.bStopOn)
	{
		if (des > .5f && std::fabs(dT) > 2.2f && ((sp > 14.f && vf0 > 5.f) || (sp > 12.f && vf0 < -5.f)))
		{
			s.bStopOn = true; s.bStopBack = vf0 < 0.f;
			const float th = std::atan2(s.vy, s.vx);
			s.StopSide = std::fabs(WrapA(th + PI_F / 2.f - s.fa)) <= std::fabs(WrapA(th - PI_F / 2.f - s.fa)) ? 1.f : -1.f;
		}
	}
	else if (!(des > .3f && sp > 1.6f && std::fabs(dT) > 1.4f)) s.bStopOn = false;

	float edge = 0.f;
	if (s.bStopOn)
	{
		// lines 573-575: turn the skates 90 degrees to travel, 14 rad/s max
		const float th = std::atan2(s.vy, s.vx), ta = th + s.StopSide * PI_F / 2.f;
		const float st = Clamp(WrapA(ta - s.fa), -14.f * dt, 14.f * dt);
		s.fa += st; s.turn = st / dt; edge = s.StopSide;
	}
	else if (des > .08f)
	{
		// line 577: backward skating when the input is almost opposite, slow and not carrying
		back = std::fabs(diff) > 2.3f && sp < mx * .6f && !in.bHasPuck && vf0 < mx * .5f;
		if (!back)
		{
			// line 578: edge-radius turning. rm = turn radius ft; piv = pivot rate rad/s when slow
			const float rm = (2.4f + .12f * std::max(0.f, vf0)) / std::sqrt(ag);
			const float piv = std::min(in.bIsControlled ? 14.f : 7.5f, (2.5f + 11.f * std::max(0.f, 1.f - sp / (mx * .45f))) * ag);
			const float yaw = std::max(std::max(0.f, vf0) / rm, piv);
			const float st = Clamp(diff, -yaw * dt, yaw * dt);
			s.fa += st; s.turn = st / dt; edge = Clamp(diff / .6f, -1.f, 1.f);
		}
	}
	s.bBack = back;
	const float fx = std::cos(s.fa), fy = std::sin(s.fa);
	vf = s.vx * fx + s.vy * fy;
	float vl = -s.vx * fy + s.vy * fx; // lateral (sideways slip) velocity
	if (s.bStopOn)
	{
		// line 582: stop scrapes lateral speed; forward speed decays exp(-1.2 dt)
		const float a = (20.f + .3f * sp) * std::sqrt(ag);
		vl -= Sign(vl) * std::min(std::fabs(vl), a * dt);
		vf *= std::exp(-1.2f * dt);
	}
	else
	{
		if (des > .08f)
		{
			if (back)
			{
				const float tgt = -des * mx * .5f;
				if (vf > tgt) vf = std::max(tgt, vf - 70.f * ag * dt); else vf = std::min(tgt, vf + 60.f * dt);
			}
			else if (al > .35f)
			{
				const float tgt = des * mx * (.55f + .45f * al);
				if (vf < tgt)
				{
					const float a = (36.f * (1.f - std::pow(Clamp(vf / mx, 0.f, 1.f), 1.4f)) + 6.f) * ag;
					vf = std::min(tgt, vf + a * dt); s.acc01 = Clamp(a / 60.f, 0.f, 1.f);
				}
				else vf = std::max(tgt, vf - 48.f * dt);
			}
			else if (al < -.3f) vf = std::max(0.f, vf - 90.f * dt);
			else vf *= std::exp(-.8f * dt);
		}
		else vf *= std::exp(-.5f * dt);
		if (vf > 0.f) vf *= std::exp(-.1f * std::fabs(s.turn) * dt); // carving costs speed
		// line 589: GRIP BUDGET. Sideways slip is removed at most G ft/s^2; the removed slip feeds 45% into forward speed
		const float G = 85.f * (.8f + .2f * ag), k = 6.f + 9.f * (1.f - std::min(1.f, sp / mx));
		const float r = std::min(std::fabs(vl), std::min(std::fabs(vl) * (1.f - std::exp(-k * dt)), G * dt));
		vl -= Sign(vl) * r;
		if (vf > -2.f) vf += r * .45f;
	}
	if (vf > mx * 1.05f) vf = mx * 1.05f;
	s.vx = vf * fx - vl * fy; s.vy = vf * fy + vl * fx;
	const float s2 = std::hypot(s.vx, s.vy);
	if (s2 > mx * 1.15f) { const float q = mx * 1.15f / s2; s.vx *= q; s.vy *= q; }
	s.edge = edge;
	s.stp = s.stp + ((s.bStopOn ? 1.f : 0.f) - s.stp) * std::min(1.f, dt * 10.f);
	s.bCrossover = !s.bStopOn && std::fabs(edge) > .6f && vf > 14.f;
	s.bSpray = s.stp > .4f && s2 > 6.f;
	if (des > .08f && !s.bStopOn && s2 > 1.f) s.ph = std::fmod(s.ph + s2 * .35f * dt, 6.2832f);
}

// =====================================================================================================================================
// GOALIE (game.html lines 734-756 goalieStep, line 735 goalieHV, line 693-697 save selection)
// =====================================================================================================================================
struct FGoalieState
{
	float x = 0.f, y = MY;   // ft
	float vy = 0.f;          // lateral velocity ft/s
	float react = 0.f;       // reaction delay left (s)
	float recov = 0.f;       // recovery after a save (s)
	float flipT = 0.f;       // direction-reversal penalty timer
	float mvd = 0.f;         // last move direction
	float Gl = .5f;          // skill 0.38..0.78 (Goalies.csv SimGl)
	int32_t ShotId = -1;     // puck.sid last seen
};
struct FGoalieWorld
{
	float OwnGX = GX;        // t.ownGX: GX for the +x side team (side>0), W-GX otherwise
	float Dir = 1.f;         // t.dir (+1 defends left goal at x=GX, shooters come from +x)
	float PuckX = W / 2, PuckY = MY, PuckVx = 0.f, PuckVy = 0.f;
	bool bShotInFlight = false; // puck.shot
	float WindupX = 0.f, WindupY = 0.f; bool bWindup = false; // opponent shooter in shot windup within 75 ft (wu)
	bool bCarrierNear = false; float CarrierVy = 0.f;         // opp carrier within 46 ft of the net (ry+=oc.vy*.32)
	float DiffGk = 1.f;      // dkf(t,'gk')
};

// goalieStep target selection (lines 745-752). Returns the desired y (ft). Deterministic part only: poke check random trigger lives in the actor.
inline float GoalieTargetY(const FGoalieState& g, const FGoalieWorld& w)
{
	const float gx0 = w.OwnGX;
	const float dpk = std::hypot(w.PuckX - gx0, w.PuckY - MY);
	const float dep = 3.2f + 1.7f * Clamp((70.f - dpk) / 45.f, 0.f, 1.f); // depth out of the crease along x
	float ty;
	if (w.bShotInFlight && !(g.react > 0.f) && std::fabs(w.PuckVx) > 25.f && (gx0 - w.PuckX) * w.PuckVx > 0.f)
	{
		// line 746: shot in flight: project to the goal line, reflect off the boards (3 ft margin)
		const float tt = std::fabs(gx0 - w.PuckX) / std::fabs(w.PuckVx);
		float py = w.PuckY + w.PuckVy * tt;
		if (py < 3.f) py = 6.f - py;
		if (py > H - 3.f) py = 2.f * (H - 3.f) - py;
		ty = py;
	}
	else
	{
		float ry = w.bWindup ? w.WindupY : w.PuckY, rx = w.bWindup ? w.WindupX : w.PuckX;
		if (w.bCarrierNear && !w.bWindup) ry += w.CarrierVy * .32f;
		const float rel = ry - MY, dxp = std::max(5.f, std::fabs(rx - gx0)), ang = std::atan(std::fabs(rel) / dxp);
		if (ang > .95f && dxp < 24.f) ty = MY + Sign(rel) * GK_POST;                       // low angle: hug the near post
		else ty = MY + Clamp(rel * (dep + 2.f) / dxp * 2.1f, -4.4f, 4.4f);                  // arc between shooter and net centre
	}
	return Clamp(ty, MY - 4.4f, MY + 4.4f);
}

// Lateral motion (lines 753-755) and depth. Call after GoalieTargetY. dt seconds.
inline void GoalieMove(FGoalieState& g, const FGoalieWorld& w, float ty, float dt)
{
	const float dd0 = ty - g.y, dir = std::fabs(dd0) > .7f ? Sign(dd0) : 0.f;
	if (dir != 0.f && g.mvd != 0.f && dir != g.mvd) g.flipT = .36f;
	if (dir != 0.f) g.mvd = dir;
	g.flipT = std::max(0.f, g.flipT - dt);
	const float vmax = (30.f + 16.f * g.Gl) * w.DiffGk * (g.flipT > 0.f ? .45f : 1.f) * (g.recov > 0.f ? .4f : 1.f);
	const float vdes = Sign(dd0) * std::min(vmax, std::sqrt(2.f * GK_ACC * std::fabs(dd0)));
	g.vy += Clamp(vdes - g.vy, -GK_ACC * dt, GK_ACC * dt);
	g.y += g.vy * dt;
	const float dpk = std::hypot(w.PuckX - w.OwnGX, w.PuckY - MY), dep = 3.2f + 1.7f * Clamp((70.f - dpk) / 45.f, 0.f, 1.f);
	const float dxTarget = w.OwnGX + w.Dir * dep;
	g.x += (dxTarget - g.x) * std::min(1.f, dt * 4.f);
}

// Reaction delay re-armed when a new shot id appears (line 739): max(.1,(.1+.07*(1-gl))*(windT>0?.8:1))
inline float GoalieReactDelay(float Gl, bool bWindup) { return std::max(.1f, (.1f + .07f * (1.f - Gl)) * (bWindup ? .8f : 1.f)); }
// Save reach (line 690): reach=3.7+2.8*gl
inline float GoalieReach(float Gl) { return 3.7f + 2.8f * Gl; }

// puck height zone (line 435): 'low' pads/skates, 'mid' glove/blocker/body, 'high' shoulders/mask, 'over' above the bar
enum class EPuckZone : unsigned char { Low, Mid, High, Over };
inline EPuckZone PuckZone(float Z) { return Z < 1.1f ? EPuckZone::Low : Z < 2.7f ? EPuckZone::Mid : Z <= FPK::BAR ? EPuckZone::High : EPuckZone::Over; }

// Save-kind selection (line 697) by puck height. HV = goalieHV(): z/1.5 clamped when airborne, else a per-shot pseudo-random 0..1
// (line 735: x=sin(sid*12.9898+1.7)*43758.5453; x-floor(x)). ady = |puck.y - goalie.y| ft. bPuckLeftOfGoalie encodes sd2==='l'.
enum class ESaveKind : unsigned char { Butterfly, Pad, Stick, Glove, Blocker };
inline float GoalieHV(float PuckZ, int32_t ShotId)
{
	if (PuckZ > 0.f) return Clamp(PuckZ / 1.5f, 0.f, 1.f);
	const double x = std::sin((double)ShotId * 12.9898 + 1.7) * 43758.5453;
	return (float)(x - std::floor(x));
}
inline ESaveKind SelectSave(float HV, float Ady, bool bSideLeft)
{
	if (HV < .3f) return Ady < 1.4f ? ESaveKind::Butterfly : ESaveKind::Pad;   // low shots: butterfly if centred, else pad
	if (Ady > 3.2f) return ESaveKind::Pad;                                     // far side: pad push
	if (HV < .5f && Ady < 1.f) return ESaveKind::Stick;
	return bSideLeft ? ESaveKind::Glove : ESaveKind::Blocker;
}
// Save probability (lines 690-693), q-terms: distance, angle, speed, screen, tip. Returns the save probability, 0 to 0.98.
inline float SaveProbability(float Gl, float ShooterShot, float ShotDist, float ShotYOffMid, float PuckSpeed, int ScreenCount, bool bTip,
                             float DiffSave, bool bRecovering, float Dy)
{
	const float q1 = Clamp((28.f - ShotDist) / 28.f, 0.f, 1.f) * .08f;
	const float q2 = Clamp(std::fabs(ShotYOffMid) / std::max(ShotDist, 12.f), 0.f, 1.2f) * .08f;
	const float q3 = Clamp((PuckSpeed - 95.f) / 90.f, -.5f, 1.f) * .07f;
	const float q4 = (float)std::min(ScreenCount, 2) * .05f, q5 = bTip ? .08f : 0.f;
	const float ps0 = Clamp(1.f + .14f * (Gl - .5f) - .35f * (ShooterShot - .5f) - q1 - q2 - q3 - q4 - q5, .5f, .97f);
	const float reach = GoalieReach(Gl);
	return Clamp(ps0 + .03f + DiffSave - (bRecovering ? .1f : 0.f), .3f, .98f) * Clamp(1.f - (Dy - reach * .6f) / (reach * .9f), 0.f, 1.f);
}
} // namespace Lihl
