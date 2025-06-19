// netlify/functions/posts.ts
import { Handler } from '@netlify/functions'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string }
  } catch {
    return null
  }
}

export const handler: Handler = async (event) => {
  try {
    const token = event.headers.authorization?.split(' ')[1]
    const decoded = token ? verifyToken(token) : null

    switch (event.httpMethod) {
      case 'GET':
        const posts = await prisma.post.findMany({
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            },
            tags: true
          }
        })
        return {
          statusCode: 200,
          body: JSON.stringify(posts)
        }

      case 'POST':
        if (!decoded) {
          return {
            statusCode: 401,
            body: JSON.stringify({ message: 'Unauthorized' })
          }
        }

        const { title, content, category, tags } = JSON.parse(event.body || '{}')
        const newPost = await prisma.post.create({
          data: {
            title,
            content,
            category,
            authorId: decoded.userId,
            tags: {
              connectOrCreate: tags.map((tag: string) => ({
                where: { name: tag },
                create: { name: tag }
              }))
            }
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            },
            tags: true
          }
        })

        return {
          statusCode: 201,
          body: JSON.stringify(newPost)
        }

      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ message: 'Method not allowed' })
        }
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    }
  }
}