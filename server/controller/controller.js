import express from 'express'
import { GithubService } from '../service/github-service'
import WebSocket from 'ws'
import crypto from 'crypto'

export class Controller extends express.Router {
  constructor(wss) {
    super()
    handleWss(wss, new GithubService())

    this.route('/payload').post((req, res) => {
      const hash = crypto.createHmac('sha1', process.env.CLIENT_SECRET).update(JSON.stringify(req.body)).digest('hex')
      if (('sha1=' + hash) === req.headers['x-hub-signature']) {
        switch (req.headers['x-github-event']) {
          case 'issues': broadcast(wss, 'issues-payload', req.body)
            break
          case 'issue_comment': broadcast(wss, 'comment-payload', req.body)
            break
          default:
            broadcast(wss, 'extra', req.body)
        }
        res.status(200).send()
      }
    })
  }
}

const broadcast = (wss, type, data) => wss.clients.forEach(client => send(client, type, data))

const handleWss = (wss, service) => {
  wss.on('connection', (ws, req) => {
    send(ws, 'info', 'You are connected...')

    ws.on('message', msg => {
      switch ((msg = JSON.parse(msg)).type) {
        case 'login':
          service.getAccessToken(msg.data)
            .then(token => {
              req.headers.token = token
              send(ws, 'logged-in')
            })
            .catch(err => send(ws, 'error', err.message))
          break

        case 'logout':
          req.headers.token = ''
          send(ws, 'logged-out', '')
          break

        case 'get-repos':
          service.getRepos(req.headers.token)
            .then(repos => send(ws, 'repos', repos))
            .catch(err => send(ws, 'error', err.message))
          break

        case 'unwatch':
          service.getHookId(msg.data, req.headers.token)
            .then(id => service.deleteHook(id, msg.data, req.headers.token))
            .then(() => send(ws, 'unwatched', msg.data))
            .catch(err => send(ws, 'error', err.message))
          break

        case 'watch':
          service.createHook(msg.data, req.headers.token)
            .then(() => send(ws, 'watching', msg.data))
            .catch(err => send(ws, 'error', err.message))
          break

        case 'get-issues':
          service.getIssues(msg.data, req.headers.token)
            .then(issues => send(ws, 'issues', issues))
            .catch(err => send(ws, 'error', err.message))
          break

        case 'edit-issue':
          service.editIssue(msg.data.issue, msg.data.repo, msg.data.state, req.headers.token)
            .catch(err => send(ws, 'error', err.message))
          break

        case 'get-issue-comments':
          service.getComments(msg.data.repo, msg.data.issue, req.headers.token)
            .then(() => send(ws, 'issue-comments', msg.data.issue))
            .catch(err => send(ws, 'error', err.message))
          break

        case 'create-comment':
          service.createComment(msg.data.repo, msg.data.issue, msg.data.body, req.headers.token)
            .catch(err => send(ws, 'error', err.message))
      }
    })

    ws.on('error', e => (e))
    setInterval(() => ws.readyState === WebSocket.OPEN ? send(ws, 'heartbeat', '') : clearInterval(), 10000)
  })
}

const send = (ws, type, data = '') => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: type, data: data }))
}
