export default async function handler(req, res) {

    let subscription_id = req.body
    console.log(subscription_id)

    const requestOptions = {
        method: 'GET',
        headers: { 'Content-Type': 'application/json',
        'Accept':'application/json', 
        'Authorization':'Bearer 01ff9101ed8a0af9ba4344f6bfaecc9f7f131570d396b4b941', 
        },
    };


    //get all transactions
    const response = await fetch(
		`https://sandbox-api.paddle.com/transactions?subscription_id=${subscription_id}`,
		requestOptions,
	);

	const data = await response.json();
    console.log(data)
    const subTransactions = data.data


	return res.status(200).json({ subTransactions });
}