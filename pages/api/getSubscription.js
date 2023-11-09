export default async function handler(req, res) {

    let subscription_id = req.body
    console.log(subscription_id)
    console.log('OKAY!!!!!')

    const requestOptions = {
        method: 'GET',
        headers: { 'Content-Type': 'application/json',
        'Accept':'application/json', 
        'Authorization':'Bearer 01ff9101ed8a0af9ba4344f6bfaecc9f7f131570d396b4b941', 
        },
    };


    //get sub data
    const response = await fetch(
		`https://sandbox-api.paddle.com/subscriptions/${subscription_id}`,
		requestOptions,
	);

	const data = await response.json();
    const subData = data.data
    console.log(subData)


	return res.status(200).json({ subData });
}