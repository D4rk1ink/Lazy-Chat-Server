const { gql, PubSub, AuthenticationError } = require('apollo-server-express')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')

const secretJWT = '37OIHY(#b#*H0g9#_Gj_(#HG()B)@(_#HBV)@BGiBL@!@_'
const genMessageID = () => {
    return crypto.randomBytes(16).toString('hex')
}
const genSenderID = () => {
    return crypto.randomBytes(8).toString('hex')
}

const Messages = [
    {
        id: genMessageID(),
        sender: '9',
        text: 'Hello',
        time: new Date().getTime()
    },
    {
        id: genMessageID(),
        sender: '9',
        text: 'Helloo',
        time: new Date().getTime()
    },
    {
        id: genMessageID(),
        sender: '9',
        text: 'Hellooo',
        time: new Date().getTime()
    },
    {
        id: genMessageID(),
        sender: '9',
        text: 'Helloooo',
        time: new Date().getTime()
    },
    {
        id: genMessageID(),
        sender: '9',
        text: 'Hellooooo',
        time: new Date().getTime()
    },
]
const pubsub = new PubSub()

const typeDefs = gql`
    scalar Date
    type Query {
        Messages(lastIndex: Int): Messages!
    }
    type Mutation {
        sendMessage(text: String!): Message!
    }
    type Subscription {
        messageAdded: Message!
    }
    type Messages {
        items: [Message]!
        lastIndex: Int!
        hasPrev: Boolean!
    }
    type Message {
        id: String!
        sender: String
        text: String
        time: Date
    }
`

const resolvers = {
    Query: {
        Messages: (parent, { lastIndex = Messages.length }) => {
            const start = lastIndex - 3 > 0 ? lastIndex - 3 : 0
            const end = lastIndex
            return {
                items: Messages.slice(start, end),
                lastIndex: start,
                hasPrev: lastIndex - 3 > 0
            }
        }
    },
    Mutation: {
        sendMessage: (parent, { text }, context) => {
            if (context.auth) {
                const newMessage = {
                    id: genMessageID(),
                    sender: context.auth,
                    text: text,
                    time: new Date().getTime()
                }
                Messages.push(newMessage)
                pubsub.publish('MESSAGE', { messageAdded: newMessage })
                return newMessage
            } else {
                throw new AuthenticationError()
            }
        }
    },
    Subscription: {
        messageAdded: {
            subscribe: async (parent, args, context) => {
                return pubsub.asyncIterator('MESSAGE')
            }
        }
    }
}

exports.graphQLConfig = {
    typeDefs: typeDefs,
    resolvers: resolvers,
    context: ({ req, connection }) => {
        if (connection) {
            // check connection for metadata
            return connection.context
        } else {
            // check from req
            const authorization = req.headers.authorization
            if (authorization && authorization !== '' && authorization.split('-').length >= 2) {
                return { auth: authorization }
            } else {
                throw new Error('Invalid Authorization.')
            }
            return {}
        }
    },
    playground: true
}