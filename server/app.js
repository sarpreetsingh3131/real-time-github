import { config } from 'dotenv'
import express from 'express'
import path from 'path'
import bodyParser from 'body-parser'
import http from 'http'
import WebSocket from 'ws'
import { Controller } from './controller/controller'
import { dirname } from 'path'

config({ path: './.env' })

let app = express()
let port = process.env.PORT


app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, '..', 'public')))

let server = http.createServer(app)

app.use('', new Controller(new WebSocket.Server({ server })))

app.use((req, res, next) => res.status(404).send({ error: 'not found' }))

app.use((err, req, res, next) => res.status(500).send({ error: err.message }))

server.listen(port, () => console.log('server running on ' + process.env.HOST + port))
