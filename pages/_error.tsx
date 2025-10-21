import { NextPageContext } from 'next'

interface ErrorPageProps {
  statusCode?: number
}

function ErrorPage({ statusCode }: ErrorPageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-6">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Something went wrong</h1>
      <p className="text-lg text-gray-600">
        {statusCode
          ? `An error ${statusCode} occurred on the server.`
          : 'An unexpected error occurred on the client.'}
      </p>
      <a
        href="/"
        className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
      >
        Return to dashboard
      </a>
    </div>
  )
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 404
  return { statusCode }
}

export default ErrorPage
