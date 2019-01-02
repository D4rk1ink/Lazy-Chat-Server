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

const Messages = []
const pubsub = new PubSub()

const typeDefs = gql`
    scalar Date
    type Query {
        Messages(page: Int!): Messages!
    }
    type Mutation {
        createProfile(name: String!, avatar: Int!): Auth!
        addMessage(text: String!): Message!
    }
    type Subscription {
        messageAdded: Message!
    }
    type Messages {
        items: [Message]!
        hasPrev: Boolean
    }
    type Message {
        id: String!
        sender: Sender
        text: String
        time: Date
    }
    type Auth {
        token: String!
    }
    type Sender {
        id: String!
        name: String
        avatar: Int
    }
`

const resolvers = {
    Query: {
        Messages: (parent, { page }) => {
            return {
                items: Messages,
                hasPrev: false
            }
        }
    },
    Mutation: {
        createProfile: (parent, { name, avatar }) => {
            return {
                token: jwt.sign({
                    id: genSenderID(),
                    name: name,
                    avatar: avatar
                }, secretJWT)
            }
        },
        addMessage: (parent, { text }, context) => {
            if (context.currentUser) {
                const newMessage = {
                    id: genMessageID(),
                    sender: {
                        id: context.currentUser.id,
                        name: context.currentUser.name,
                        avatar: context.currentUser.avatar
                    },
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
            try {
                const authorization = req.headers.authorization
                if (authorization && authorization !== '') {
                    const decoded = jwt.verify(authorization, secretJWT)
                    req.currentUser = decoded
                } else {
                    throw new Error('Invalid Authorization.')
                }
            } catch (err) {
                req.currentUser = null
            }
            return req
        }
    },
    playground: true
}