import '../styles/globals.css'
import localFont from '@next/font/local'
import { ChakraProvider } from '@chakra-ui/react'
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { useState } from 'react'

const paddleFont = localFont({
  src: '../public/ABCFavoritVariable.ttf',
  variable: '--font-paddleFont'
})

export default function MyApp({ Component, pageProps }) {

  return (
      <ChakraProvider>
        <main className={`${paddleFont.variable} font-sans`}>
          <Component {...pageProps} />
        </main>
      </ChakraProvider>
  )
}
