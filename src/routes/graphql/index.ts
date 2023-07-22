import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { createGqlResponseSchema, gqlResponseSchema } from './schemas.js';
import { graphql, buildSchema } from 'graphql';

const typeDefs = `#graphql
  type MemberType {
    id: ID!
    discount: Float!
    postsLimitPerMonth: Int!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    author: User!
  }

  type User {
    id: ID!
    name: String!
    balance: Float!
    profile: Profile!
    posts: [Post!]!
  }

  type Profile {
    id: ID!
    isMale: Boolean!
    yearOfBirth: Int!
    user: User!
    memberType: MemberType!
  }

  type SubscribersOnAuthors {
    subscriber: User
    author: User

  }

  type Query {
    memberTypes: [MemberType!]!
    posts: [Post!]!
    users: [User!]!
    profiles: [Profile!]!
    user(id: ID!): User
    post(id: ID!): Post
    profile(id: ID!): Profile
  }
`;

const resolvers = {
  Query: {
    memberTypes: async (parent, args, { prisma }) => {
      return await prisma.memberType.findMany();
    },
    posts: async (parent, args, { prisma }) => {
      return await prisma.post.findMany();
    },
    users: async (parent, args, { prisma }) => {
      return await prisma.user.findMany();
    },
    profiles: async (parent, args, { prisma }) => {
      return await prisma.profile.findMany();
    },
    user: async (parent, { id }, { prisma }) => {
      return await prisma.user.findUnique({
        where: { id },
        include: {
          profile: {
            include: {
              memberType: true,
            },
          },
          posts: true,
        },
      });
    },
    post: async (parent, { id }, { prisma }) => {
      return await prisma.post.findUnique({ where: { id } });
    },
    profile: async (parent, { id }, { prisma }) => {
      return await prisma.profile.findUnique({ where: { id } });
    },
  },
};

const rootValue = {
  memberTypes: async (obj, { prisma }) => {
    // console.log('obj------>', obj);
    // console.log('prisma------>', prisma);
    // console.log('args------>', args);
    return await prisma.memberType.findMany();
  },
  posts: async (parent, { prisma }) => {
    return await prisma.post.findMany();
  },
  users: async (parent, { prisma }) => {
    return await prisma.user.findMany();
  },
  profiles: async (parent, { prisma }) => {
    return await prisma.profile.findMany();
  },
  user: async (parent, { id }, { prisma }) => {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        profile: {
          include: {
            memberType: true,
          },
        },
        posts: true,
      },
    });
  },
  post: async (parent, { id }, { prisma }) => {
    return await prisma.post.findUnique({ where: { id } });
  },
  profile: async (parent, { id }, { prisma }) => {
    return await prisma.profile.findUnique({ where: { id } });
  },
};
const executableSchema = buildSchema(typeDefs);

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { prisma } = fastify;
  fastify.route({
    url: '/',
    method: 'POST',
    schema: {
      ...createGqlResponseSchema,
      response: {
        200: gqlResponseSchema,
      },
    },
    async handler(req) {
      const { query, variables } = req.body;
      // console.log('req.body-->', req.body);
      // console.log('query-->', query);

      const result = await graphql({
        schema: executableSchema,
        source: query,
        contextValue: { prisma }, // Pass prisma as context !!!
        variableValues: variables,
        rootValue, // Pass resolvers !!!
      });

      return result;
    },
  });
};

export default plugin;
