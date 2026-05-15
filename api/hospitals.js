export default async function handler(req, res) {

  try {

    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        error: "Missing query"
      });
    }

    const response = await fetch(
      "https://overpass-api.de/api/interpreter",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: `data=${encodeURIComponent(query)}`
      }
    );

    if (!response.ok) {

      return res.status(response.status).json({
        error: "Overpass API failed"
      });
    }

    const data = await response.json();

    res.setHeader(
      "Access-Control-Allow-Origin",
      "*"
    );

    return res.status(200).json(data);

  } catch (error) {

    return res.status(500).json({
      error: "Server error",
      details: error.message
    });
  }
}