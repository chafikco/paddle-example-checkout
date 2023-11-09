import Script from "next/script";
import Router from 'next/router'

export function PaddleLoader() {
	return (
		<Script
			src="https://cdn.paddle.com/paddle/v2/paddle.js"
			onLoad={() => {
				Paddle.Environment.set("sandbox");
				Paddle.Setup({ 
					seller: 3444,
					eventCallback: (event) => {
						console.log(event)
						if (event.name === "checkout.completed") {

						//save transaction_id & customer_id to session storage

						// sessionStorage.setItem("transaction_id", event.data.transaction_id);
						// sessionStorage.setItem("customer_id", event.data.customer.id);
						console.log(event.data)

							Router.push({
								pathname: '/dashboard'
							})
						}
					}
			  });
			}}
		/>
	);
}
