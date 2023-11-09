import { PaddleLoader } from "../components/PaddleLoader";
import { Summary } from "../components/Summary";
import React, { useEffect, useState } from 'react';
import {
	useNumberInput,
	HStack,
	Button,
	Input,
	Card, 
	CardBody, 
	Text,
	Stack,
  } from '@chakra-ui/react'
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'

export default function Home(props) {
	// list of price_id's
	// Base Plan - Growth
	const annual = 'pri_01gswmc7s6n2sn1nyen8gc12ed'
	const monthly = 'pri_01gswmcwfgbecj8v5fgw807mas'

	// Add On - Spaces
	const annual_space = 'pri_01gtfg0p2xz2b01s7pq9r7x709'
	const monthly_space = 'pri_01gtffwm3e2aw9hyqssvv0z5nw'

	// Add On - Integrations
	const annual_integration = 'pri_01gtfg1vvydfar5f8qpxa27n20'
	const monthly_integration = 'pri_01gtffxr88e48wx7rsnnx5ca4m'

	// Add On - SSO
	const one_time_sso = 'pri_01gtffz0xmcxmb9pc6vbvsy3jj'


	const { getInputProps, getIncrementButtonProps, getDecrementButtonProps } = useNumberInput({
      defaultValue: 1,
      min: 1,
      max: 100,
    })

	const inc = getIncrementButtonProps()
	const dec = getDecrementButtonProps()
	const input = getInputProps()

	const [showCheckout, setShowCheckout] = useState(false);
	const [showPricing, setShowPricing] = useState(false);

	const [planTotal, setPlanTotal] = useState({
		total: 0,
		subTotal: 0,
		tax: 0,
		name: 'pri_01gswmcwfgbecj8v5fgw807mas',
		interval: 'monthly',
		addons: 'false',
		quantity: 1
	 });

	async function getPreview(interval, quantity, plan, addons) {

		console.log(interval, quantity, plan, addons)

		let params = {
			price_id: plan,
			quantity: quantity,
			interval: interval,
			addons: addons
		};

		// get new preview on click
		const response = await fetch('http://localhost:3000/api/pricePreview', { method: "POST", body: JSON.stringify(params) });
		const data = await response.json();
		const prices = data.data;
		// console.log(prices)
		setPlanTotal({
			total: prices.data.details.totals.total/100,
			subTotal: prices.data.details.totals.subtotal/100,
			tax: prices.data.details.totals.tax/100,
			name: plan,
			interval: interval,
			addons: addons,
			quantity: prices.data.details.line_items[0].quantity,
			planId: prices.data.details.line_items[0].price_id
		})
		console.log(planTotal)
	}
	
	return (
		<>
			<PaddleLoader />
			<div className="bg-gray-900 py-24 sm:py-32">
				<div className="mx-auto max-w-7xl px-6 lg:px-8">
					<div className="mx-auto max-w-4xl text-center">
					<h2 className="text-lg font-semibold leading-8 tracking-tight text-yellow-300">Pricing</h2>
					<p className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
						Paddle Billing Demo
					</p>
					</div>
					<p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-300">
					Choose an affordable plan that’s packed with the best features for engaging your audience, creating customer
					loyalty, and driving sales.
					</p>
				</div>
				<div className="my-8 flex justify-center gap-8">
				<div className="p-8 xl:p-10 bg-white/5 text-white rounded-3xl w-500px ring-yellow-300 ring-2">
					<div className="pb-2 text-lg mb-4 flex justify-between">
						<h2>Growth Plan</h2>
						<span className="rounded-full bg-yellow-300 py-1 px-2.5 text-xs font-semibold leading-5 text-black">Most Popular</span>
					</div>
					<div className="flex justify-between">
						<div className={showCheckout ? 'checkout-frame grow bg-white rounded-3xl' : 'checkout-frame grow rounded-3xl hidden'}></div>
						{!showPricing ? <div className="pricingSelection grow">
							<div className="mb-4">
								<p>A plan that scales with your rapidly growing business.</p>
							</div>
							<div className="flex gap-4">
							<Card 
									className="cursor-pointer mb-4 w-200px" 
									onClick={() => getPreview('annual', input.value, annual, planTotal.addons)} 
									_hover={{
										background: "gray.100", 
										transitionDuration: '0.2s', 
										transitionTimingFunction: "ease-in-out"
									}}>
										<CardBody>
											<span className="text-xxs font-semibold rounded-3xl py-1 px-2 ring-green-600 ring-1 text-green-600">Yearly - 2 months free!</span>											
											<p className="mt-3 flex items-baseline gap-x-1">
												<span className="text-4xl font-bold tracking-tight text-black">$30</span>
												{/* <span className="text-sm font-semibold leading-6 text-gray-600">/month</span> */}
											</p>
											<Text size=''>Per seat</Text>
										</CardBody>
									</Card>
									<Card 
									className="cursor-pointer mb-4 w-200px" 
									onClick={() => getPreview('monthly', input.value, monthly, planTotal.addons)}  
									_hover={{
										background: "gray.100", 
										transitionDuration: '0.2s', 
										transitionTimingFunction: "ease-in-out"
									}}>
										<CardBody>
											<span className="text-xxs font-semibold rounded-3xl py-1 px-2 ring-black ring-1 text-black">Monthly</span>											
											<p className="mt-3 flex items-baseline gap-x-1">
												<span className="text-4xl font-bold tracking-tight text-black">$35</span>
												{/* <span className="text-sm font-semibold leading-6 text-gray-600">/month</span> */}
											</p>
											<Text size='sm'>Per seat</Text>
										</CardBody>
									</Card>
							</div>
								Paid Seats
								<HStack maxW='150px' mt={4} mb={4}>
									<Button colorScheme={"yellow"} {...dec} onClick={() => getPreview(planTotal.interval, input.value, planTotal.name, planTotal.addons)}>-</Button>
									<Input {...input} />
									<Button colorScheme={"yellow"} {...inc} onClick={() => getPreview(planTotal.interval, input.value, planTotal.name, planTotal.addons)}>+</Button>
								</HStack>
								Add Ons
								<Stack direction='column' spacing={4} mt={4}>
									<Button onClick={() => getPreview(planTotal.interval, input.value, planTotal.name, 'true')} colorScheme='yellow' variant='solid' width='200px'>
										Unlimited Spaces
									</Button>
									<Button onClick={() => getPreview(planTotal.interval, input.value, planTotal.name, 'true')} colorScheme='yellow' variant='solid' width='200px'>
										Unlimited Integrations
									</Button>
									<Button onClick={() => getPreview(planTotal.interval, input.value, planTotal.name, 'true')} colorScheme='yellow' variant='solid' width='200px'>
										Enable SSO
									</Button>
								</Stack>
						</div> : null}
					</div>
				</div>
				<div>
					<Summary data={planTotal}/>
					<Button 
					className='mt-2 w-full'
					type="button"
					colorScheme={"yellow"}
					onClick={() => {
						setShowPricing(true)
						setShowCheckout(true)
						Paddle.Checkout.open({
							settings: {
								displayMode: "inline",
								theme: "light",
								locale: "en",
								frameTarget: "checkout-frame",
								frameStyle: "min-width: 400px; width: 100%; min-height: 100% ",
								frameInitialHeight: "450"
							},
							customer: {
								email: "chafik@paddle.com",
								address: {
									countryCode: "GB",
									postalCode: "E82HL"
									}
								},
								items: [
									{
										priceId: planTotal.planId,
										quantity: planTotal.quantity
									},
								],
						});
					}}>
						Confirm & Checkout
					</Button>
					<Button
					className='mt-2 w-full'
					type="button"
					colorScheme={"yellow"}
					variant={"outline"}
					onClick={() => {
						setShowPricing(false)
						setShowCheckout(false)
					}}>
						Go Back
					</Button>
				</div>
				</div>
    		</div>
		</>
	);
}