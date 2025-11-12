import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { CheckSquare } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import axios from 'axios'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        toast.error('Invalid credentials')
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail) {
      toast.error('Please enter your email address')
      return
    }

    setForgotLoading(true)
    try {
      await axios.post('/api/auth/forgot-password', { email: forgotEmail })
      toast.success('If an account exists, a password reset email has been sent. Please check your inbox.')
      setShowForgotPassword(false)
      setForgotEmail('')
    } catch (error) {
      toast.error('Failed to send password reset email')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <div className="relative h-32 w-64">
              <Image 
                src="/images/sweetwaterlogo.png" 
                alt="Sweetwater Helium" 
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
          <p className="mt-2 text-gray-600">Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <Input
              label="Email address"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />

            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Forgot your password?
            </button>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={showForgotPassword}
        onClose={() => {
          setShowForgotPassword(false)
          setForgotEmail('')
        }}
        title="Reset Your Password"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowForgotPassword(false)
                setForgotEmail('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleForgotPassword}
              disabled={forgotLoading || !forgotEmail}
            >
              {forgotLoading ? 'Sending...' : 'Send Reset Email'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter your email address and we&apos;ll send you a new temporary password.
          </p>
          <Input
            label="Email Address"
            type="email"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
          />
          <p className="text-xs text-gray-500">
            💡 After receiving your temporary password, please log in and change it immediately in Settings.
          </p>
        </form>
      </Modal>
    </div>
  )
}
