const express = require('express')
const { ApolloServer, gql } = require('apollo-server-express')
const { graphQLConfig } = require('./graphql')

const app = express()
const apollo = new ApolloServer(graphQLConfig)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: false, limit: '10mb' }))
apollo.applyMiddleware({ app: app, path: '/graphiql' })

const server = app.listen(8080, () => console.log('Server Started'))
apollo.installSubscriptionHandlers(server)