// GET /api/leaderboard — returns the leaderboard from CITY_DATA KV
export async function onRequestGet(context) {
  try {
    const data = await context.env.CITY_DATA.get("leaderboard");
    if (!data) {
      return Response.json([], { status: 200 });
    }
    return Response.json(JSON.parse(data));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
