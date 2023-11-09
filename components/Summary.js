import {
	Divider,
	Stat,
	StatLabel,
	StatNumber,
	StatHelpText,
    Button
  } from '@chakra-ui/react'
import React, { useState } from 'react';


export function Summary(data) {
    const [hidden, setHidden] = useState(false);

    const planTotal = data.data
    // console.log(planTotal)
	return (
        <div className="border rounded-3xl p-6  bg-white/5 w-275px mb-2 text-white h-300px">
            <Stat>
                <p className='text-xl mb-2'>Bill Summary</p>
                <StatLabel>Total</StatLabel>
                <StatNumber>${planTotal.total}</StatNumber>
                <Divider mt="2" mb="2"/>
                <StatLabel>Subtotal</StatLabel>
                <StatHelpText>${planTotal.subTotal}</StatHelpText>
                <Divider mt="2" mb="2"/>
                <StatLabel>Tax</StatLabel>
                <StatHelpText>${planTotal.tax}</StatHelpText>
            </Stat>
        </div>
	);
}