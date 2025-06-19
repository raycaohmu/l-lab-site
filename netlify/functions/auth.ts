// netlify/functions/auth.ts
import { Handler } from '@netlify/functions'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' })
    }
  }

  try {
    const { email, password, action } = JSON.parse(event.body || '{}')

    if (action === 'login') {
      const user = await prisma.user.findUnique({ where: { email } })
      
      if (!user || !await bcrypt.compare(password, user.password)) {
        return {
          statusCode: 401,
          body: JSON.stringify({ message: 'Invalid credentials' })
        }
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET)
      
      return {
        statusCode: 200,
        body: JSON.stringify({ token, user: { ...user, password: undefined } })
      }
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid action' })
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    }
  }
}