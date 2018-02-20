import React from 'react'

export class Header extends React.Component {
  render() {
    return (
      <div className='ui large menu'>
        <div className='item'>
          <h2>Real Time Github</h2>
        </div>
        {this.props.values.isLoggedIn
          ? <div className='item link' onClick={() => this.props.changeView(true, null)} >
            <h3>Repositories</h3>
          </div>
          : null
        }
        <div className='right menu'>
          <div className='item'>
            {this.props.values.isLoggedIn
              ? <div className='ui primary button' onClick={() => this.props.send('logout')}>Log out</div>
              : <div className='ui primary button' onClick={this.redirect}>Log in</div>
            }
          </div>
        </div>
      </div>
    )
  }

  redirect() {
    window.location.replace('https://github.com/login/oauth/authorize' +
      '?client_id=' + process.env.CLIENT_ID +
      '&scope=' + process.env.SCOPE +
      '&redirect_uri=' + (process.env.NODE_ENV == 'production'
        ? process.env.PROD_REDIRECT_URI
        : process.env.DEV_REDIRECT_URI))
  }
}
