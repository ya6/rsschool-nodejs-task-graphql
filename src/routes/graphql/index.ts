import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { createGqlResponseSchema, gqlResponseSchema } from './schemas.js';
import { graphql, buildSchema } from 'graphql';

const typeDefs = `#graphql
 scalar UUID
 scalar MemberTypeId
  type MemberType {
    id: MemberTypeId!
    discount: Float!
    postsLimitPerMonth: Int!
  }

  type Post {
    id:UUID!
    title: String!
    content: String!
    author: User!
  }

 type User {
  id: UUID!
  name: String!
  balance: Float!
  profile: Profile
  posts: [Post]
  userSubscribedTo: [UserSubscribedTo]
  subscribedToUser: [SubscribedToUser]
}

 type UserSubscribedTo {
id: UUID
name: String
balance: Float
subscribedToUser: [User]
}

 type SubscribedToUser {
    id:UUID
name: String
balance: Float
userSubscribedTo: [User] 

}

type SubscribersOnAuthors {
  subscriber: User
  author: User
}
  

  type Profile {
    id: UUID!
    isMale: Boolean!
    yearOfBirth: Int!
    user: User!
    memberType: MemberType!
  }


  type Query {
    memberTypes: [MemberType!]!
    posts: [Post!]!
    users: [User!]!
    profiles: [Profile!]!
    user (id: UUID!): User
    post (id: UUID!): Post
    profile (id: UUID!): Profile
    memberType (id: MemberTypeId!): MemberType
   

   
  }
`;

const rootValue = {
  user: async ({ id }, { prisma }) => {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: {
          include: {
            memberType: true,
          },
        },
        posts: true,
        userSubscribedTo: true,
        subscribedToUser: true,
      },
    });

    const subscribedToUser = await prisma.user.findMany({
      where: {
        userSubscribedTo: {
          some: {
            authorId: id,
          },
        },
      },
    });

    const userSubscribedTo = await prisma.user.findMany({
      where: {
        subscribedToUser: {
          some: {
            subscriberId: id,
          },
        },
      },
    });

    const _u = userSubscribedTo.map((u) => {
      u.subscribedToUser = subscribedToUser;
      return u;
    });

    const _s = subscribedToUser.map((s) => {
      s.userSubscribedTo = userSubscribedTo;
      return s;
    });
    user.userSubscribedTo = _u;

    user.subscribedToUser = _s;

    return user;
  },
  memberTypes: async (_, { prisma }) => {
    return await prisma.memberType.findMany();
  },
  posts: async (_, { prisma }) => {
    return await prisma.post.findMany();
  },
  users: async (_, { prisma }) => {
    return await prisma.user.findMany({
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
  profiles: async (_, { prisma }) => {
    return await prisma.profile.findMany();
  },

  post: async ({ id }, { prisma }) => {
    return await prisma.post.findUnique({ where: { id } });
  },
  profile: async ({ id }, { prisma }) => {
    return await prisma.profile.findUnique({ where: { id } });
  },
  memberType: async ({ id }, { prisma }) => {
    return await prisma.memberType.findUnique({ where: { id } });
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
      const result = await graphql({
        schema: executableSchema,
        source: query,
        contextValue: { prisma },
        variableValues: variables,
        rootValue,
      });

      return result;
    },
  });
};

export default plugin;
