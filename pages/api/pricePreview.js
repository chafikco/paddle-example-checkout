export default async function handler(req, res) {
  
    let params = JSON.parse(req.body)
    console.log(params)

    let payload = {
      // currency_code: "USD",
      // customer_ip_address: "172.93.232.194",
      items: params,
      // discount_id: "dsc_01gtwhvc9wfvhfn61arc6r5s8s"
    };

    console.log(payload)

    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
        'Accept':'application/json', 
        'Authorization':'Bearer 01ff9101ed8a0af9ba4344f6bfaecc9f7f131570d396b4b941',
        },
        body: JSON.stringify(payload),
        redirect: 'follow'
    };

    //transaction preview call
    const response = await fetch(
		"https://sandbox-api.paddle.com/transactions/preview",
		requestOptions,
	);

	const data = await response.json();
  console.log(data)
  console.log(data.error)

	return res.status(200).json({ data });
}