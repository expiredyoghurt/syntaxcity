export async function onRequestGet(context) {
  const cities = await context.env.CITY_DATA.list();
  return Response.json(cities);
}
