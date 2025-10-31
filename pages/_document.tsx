import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/images/sweetpng.ico" type="image/x-icon" />
        <link rel="shortcut icon" href="/images/sweetpng.ico" type="image/x-icon" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="description" content="Comprehensive project management application" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
