// GET /api/cities — returns all city/account names from CITY_DATA KV
export async function onRequestGet(context) {
  try {
    const list = await context.env.CITY_DATA.list();
    const cities = list.keys
      .filter((k) => k.name.startsWith("account:"))
      .map((k) => k.name.replace("account:", ""));
    return Response.json(cities);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
