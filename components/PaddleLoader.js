import Script from "next/script";
import Router from 'next/router'

export function PaddleLoader() {
	return (
		<Script
			src="https://cdn.paddle.com/paddle/v2/paddle.js"
			onLoad={() => {
				Paddle.Environment.set("sandbox");
				Paddle.Initialize({ 
					token: 'test_46ddeeef8d6bcf6957a73665125',
					eventCallback: (event) => {
						console.log(event)
					}
				});
			}}
		/>
	);
}
