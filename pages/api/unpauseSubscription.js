export default async function handler(req, res) {
  
    let subscription_id = req.body

    console.log(subscription_id)

    let payload = {
        "scheduled_change": null
    }

    const requestOptions = {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json',
        'Accept':'application/json', 
        'Authorization':'Bearer 01ff9101ed8a0af9ba4344f6bfaecc9f7f131570d396b4b941',
        },
        redirect: 'follow',
        body: JSON.stringify(payload),
    };


    //pause subscription call
    const response = await fetch(
		`https://sandbox-api.paddle.com/subscriptions/${subscription_id}`,
		requestOptions,
	);

	const data = await response.json();
    console.log(data)

	return res.status(200).json({ data });
}