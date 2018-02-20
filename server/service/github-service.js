import fetch from 'node-fetch'

// for dev use ngrok. download ngrok from https://ngrok.com/download
let hookUrl = process.env.NODE_ENV === 'production' ? process.env.PROD_HOOK_URL : process.env.DEV_HOOK_URL

export class GithubService {
  callAPI(url, method, token, body) {
    let config = {
      method: method,
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
    }
    if (token !== null) config.headers.Authorization = 'Bearer ' + token.access_token
    if (body != null) config.body = JSON.stringify(body)
    return fetch(url, config)
  }

  getAccessToken(code) {
    return new Promise((resolve, reject) => {
      this.callAPI('https://github.com/login/oauth/access_token', 'POST', null, {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code: code
      })
        .then(res => { return res.json() })
        .then(token => token.error ? reject(new Error(token.error)) : resolve(token))
        .catch(err => reject(err))
    })
  }

  getRepos(token) {
    return new Promise((resolve, reject) => {
      this.callAPI('https://api.github.com/user/repos', 'GET', token, null)
        .then(res => { return res.json() })
        .then(res => {
          if (res.error) reject(new Error(res.error))
          let promises = []
          res.forEach(repo => promises.push(this.getHooks(repo, token)))
          resolve(Promise.all(promises))
        })
        .catch(err => reject(err))
    })
  }

  getHooks(repo, token) {
    return new Promise((resolve, reject) => {
      this.callAPI('https://api.github.com/repos/' + repo.owner.login + '/' + repo.name + '/hooks', 'GET', token, null)
        .then(res => { return res.json() })
        .then(res => {
          if (res.error) reject(new Error(res.error))
          repo.isWatching = false
          if (res[0]) {
            res.forEach(item => {
              repo.isWatching = item.config.url === hookUrl
            })
          }
          resolve(repo)
        })
        .catch(err => reject(err))
    })
  }

  getHookId(repo, token) {
    return new Promise((resolve, reject) => {
      this.callAPI('https://api.github.com/repos/' + repo.owner.login + '/' + repo.name + '/hooks', 'GET', token, null)
        .then(res => { return res.json() })
        .then(res => {
          if (res.error) reject(new Error(res.error))
          else if (!res[0]) resolve(res)
          else if (res[0]) {
            res.forEach(item => {
              if (item.config.url === hookUrl) resolve(item.id)
            })
          }
        })
        .catch(err => reject(err))
    })
  }

  getIssues(repo, token) {
    return new Promise((resolve, reject) => {
      this.callAPI('https://api.github.com/repos/' + repo.owner.login + '/' + repo.name + '/issues?state=all', 'GET', token, null)
        .then(res => { return res.json() })
        .then(res => {
          if (res.error) reject(new Error(res.error))
          else if (!res[0]) resolve(res)
          else if (res[0]) {
            let promises = []
            res.forEach(issue => promises.push(this.getComments(repo, issue, token)))
            Promise.all(promises)
              .then(() => resolve(res))
          }
        })
        .catch(err => reject(err))
    })
  }

  editIssue(issue, repo, state, token) {
    return new Promise((resolve, reject) => {
      this.callAPI('https://api.github.com/repos/' + repo.owner.login + '/' + repo.name + '/issues/' + issue.number, 'POST', token, {
        state: state
      })
        .then(res => { return res.json() })
        .then(res => res.error ? reject(res.error) : resolve(res))
        .catch(err => reject(err))
    })
  }

  getComments(repo, issue, token) {
    return new Promise((resolve, reject) => {
      this.callAPI('https://api.github.com/repos/' + repo.owner.login + '/' + repo.name + '/issues/' + issue.number + '/comments', 'GET', token, null)
        .then(res => { return res.json() })
        .then(res => res.error ? reject(res.error) : resolve(issue.comments = res || []))
        .catch(err => reject(err))
    })
  }

  createComment(repo, issue, body, token) {
    return new Promise((resolve, reject) => {
      this.callAPI('https://api.github.com/repos/' + repo.owner.login + '/' + repo.name + '/issues/' + issue.number + '/comments', 'POST', token, { body: body })
        .then(res => { return res.json() })
        .then(res => res.error ? reject(res.error) : resolve(res))
        .catch(err => reject(err))
    })
  }

  deleteHook(id, repo, token) {
    return new Promise((resolve, reject) => {
      this.callAPI('https://api.github.com/repos/' + repo.owner.login + '/' + repo.name + '/hooks/' + id, 'DELETE', token, null)
        .then(res => res.ok ? resolve() : reject(new Error('Cannot delete')))
        .catch(err => reject(err))
    })
  }

  createHook(repo, token) {
    return new Promise((resolve, reject) => {
      this.callAPI('https://api.github.com/repos/' + repo.owner.login + '/' + repo.name + '/hooks', 'POST', token, {
        name: 'web',
        config: { url: hookUrl, content_type: 'json', insecure_ssl: '0', secret: process.env.CLIENT_SECRET },
        events: ['issues', 'issue_comment'],
        active: true
      })
        .then(res => { return res.json() })
        .then(res => res.error ? reject(new Error(res.error)) : resolve(res))
        .catch(err => reject(err))
    })
  }
}
