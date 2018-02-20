import React from 'react'
import { render } from 'react-dom'
import { Header } from './components/header.jsx'

class App extends React.Component {
  constructor() {
    super()
    this.state = { repos: [], issues: [], isReposView: false, isLoggedIn: false }
    this.socket = null
  }

  render() {
    return (
      <div>
        <Header values={this.state} send={this.send.bind(this)} changeView={this.changeView.bind(this)} />
        {this.state.isReposView ? this.displayRepos() : this.displayIssues()}
      </div>
    )
  }

  changeView(isReposView, repo) {
    if (repo !== null) {
      repo.ribon = undefined
      this.send('get-issues', repo)
    } else {
      this.setState({ isReposView: isReposView })
    }
  }

  componentDidMount() {
    if (window.location.href.split('code=')[1]) {
      window.localStorage.setItem('code', JSON.stringify(window.location.href.split('=')[1]))
      window.location.replace((process.env.NODE_ENV == 'production'
        ? process.env.PROD_REDIRECT_URI : process.env.DEV_REDIRECT_URI))
    } else if (window.localStorage.getItem('code')) {
      this.socket = new window.WebSocket(process.env.NODE_ENV == 'production' ?
        process.env.PROD_SOCKET : process.env.DEV_SOCKET)
      this.socket.onmessage = e => this.handleMessage(JSON.parse(e.data))
    }
  }

  handleMessage(msg) {
    if (msg.type !== 'heartbeat') console.log(msg)
    switch (msg.type) {
      case 'info':
        this.send('login', JSON.parse(window.localStorage.getItem('code')))
        window.localStorage.removeItem('code')
        break

      case 'logged-in':
        this.send('get-repos')
        break

      case 'logged-out':
        this.socket.close()
        this.setState({ repos: [], issues: [], isLoggedIn: false, isReposView: false })
        break

      case 'repos':
        this.setState({ repos: msg.data, isLoggedIn: true, isReposView: true })
        break

      case 'unwatched':
      case 'watching':
        let repos = this.state.repos
        repos[this.getIndex(this.state.repos, msg.data.url)].isWatching = msg.type === 'watching'
        this.setState({ repos: repos })
        break

      case 'issues':
        this.setState({ issues: msg.data, isReposView: false })
        document.body.scrollTop = 0
        document.documentElement.scrollTop = 0
        break

      case 'issue-comments':
        let issues = this.state.issues
        issues[this.getIndex(issues, msg.data.url)] = msg.data
        this.setState({ issues: issues })
        document.querySelector('audio').play()
        break

      case 'comment-payload':
      case 'issues-payload':
        let index = this.getIndex(this.state.repos, msg.data.repository.url)
        if (index !== -1) {
          if (this.state.isReposView) {
            let repos = this.state.repos
            repos[index].ribon = (msg.type === 'issues-payload' ? 'issue ' : 'comment ') + msg.data.action
            this.setState({ repos: repos })
            document.querySelector('audio').play()
          } else if (msg.type === 'issues-payload') {
            msg.data.issue.action = msg.data.action
            msg.data.issue.comments = []
            if (msg.data.action === 'opened') {
              let issues = this.state.issues
              issues.splice(0, 0, msg.data.issue)
              this.setState({ issues: issues })
              document.querySelector('audio').play()
            } else this.send('get-issue-comments', { repo: this.state.repos[index], issue: msg.data.issue })
          } else if (msg.type === 'comment-payload' && msg.data.action === 'created') {
            let issues = this.state.issues
            issues[this.getIndex(issues, msg.data.issue.url)].comments.push(msg.data.comment)
            this.setState({ issues: issues })
            document.querySelector('audio').play()
          }
        }
    }
  }

  getIndex(arr, url) {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].url === url) return i
    }
    return -1
  }

  send(type, data = '') {
    this.socket.send(JSON.stringify({ type: type, data: data }))
  }

  editIssue(state, issue) {
    this.send('edit-issue', {
      issue: issue, repo: this.state.repos[this.getIndex(this.state.repos, issue.repository_url)], state: state
    })
  }

  createComment(issue, index) {
    let body = document.querySelector('#textarea' + index).value.trim()
    if (body.length > 0) {
      this.send('create-comment', {
        repo: this.state.repos[this.getIndex(this.state.repos, issue.repository_url)], issue: issue, body: body
      })
      document.querySelector('#textarea' + index).value = ''
    }
  }

  displayIssues() {
    return (
      <div>
        {this.state.issues.map((issue, index) =>
          <div className='ui comments' key={index}>
            <h3 className='ui dividing header'>
              {issue.title + ' - ' + (issue.action || issue.state) + ' by ' + issue.user.login + ' on ' + issue.created_at.split('T')[0]}
            </h3>
            <div className='comment'>
              <a className='avatar' href={issue.user.avatar_url}><img src={issue.user.avatar_url} /></a>
              <div className='content'>
                <a className='author' href={issue.user.html_url}>{issue.user.login}</a>
                <div className='metadata'><span className='date'>{issue.created_at.split('T')[0]}</span></div>
                <div className='text'>{issue.body}</div>
              </div>
            </div>
            {issue.comments.map((comment, index) =>
              <div className='comment' key={index}>
                <a className='avatar' href={comment.user.avatar_url}>
                  <img src={comment.user.avatar_url} />
                </a>
                <div className='content'>
                  <a className='author' href={comment.user.html_url}>{comment.user.login}</a>
                  <div className='metadata'>
                    <span className='date'>{comment.created_at.split('T')[0]}</span>
                  </div>
                  <div className='text'>{comment.body}</div>
                </div>
              </div>
            )}
            <br />
            <form className='ui reply form'>
              <div className='field'>
                <textarea id={'textarea' + index} />
              </div>
            </form>
            <br />
            <button className='ui green button right floated' onClick={() => this.createComment(issue, index)}>
              Comment
            </button>
            <button className='ui button right floated'
              onClick={() => this.editIssue(issue.state === 'open' ? 'close' : 'open', issue)}>
              {(issue.state === 'open' ? 'Close' : 'Reopen') + ' issue'}
            </button>
          </div>
        )}
      </div>
    )
  }

  displayRepos() {
    return (
      <div className='ui three cards'>
        {this.state.repos.map((repo, index) =>
          <div key={index} className='card'>
            <div className='content'>
              <div className='right floated meta'>{repo.created_at.split('T')[0]}</div>
              {repo.ribon === undefined ? null : <a className='ui teal left ribbon label'>{repo.ribon}</a>}
              <img className='ui avatar image' src={repo.owner.avatar_url} />
              <a href={repo.owner.html_url}>{repo.owner.login}</a>
            </div>
            <div className='content'>
              <div className='header'>
                <a href={repo.html_url}>{repo.name}</a>
              </div>
              <div className='meta'>
                <span className='category'>{repo.language || 'Java'}</span>
              </div>
              <div className='description'>
                <p>{repo.description}</p>
              </div>
            </div>
            <div className='extra content'>
              <button className='ui button' onClick={() => this.send(repo.isWatching ? 'unwatch' : 'watch', repo)}>
                {repo.isWatching ? 'Unwatch' : 'Watch'}
              </button>
              {repo.isWatching
                ? <button className='ui button right floated' onClick={() => this.changeView(false, repo)}>Issues</button>
                : null
              }
            </div>
          </div>
        )}
      </div>
    )
  }
}

render(<App />, document.querySelector('#root'))
