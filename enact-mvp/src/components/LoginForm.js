import kind from '@enact/core/kind';
import {Component} from 'react';
import PropTypes from 'prop-types';
import BodyText from '@enact/moonstone/BodyText';
import Button from '@enact/moonstone/Button';
import Input from '@enact/moonstone/Input';
import Spinner from '@enact/moonstone/Spinner';
import LS2Request from '@enact/webos/LS2Request';

const SERVICE_ID = 'luna://com.community.floatplane.enactmvp.login';

const ls2Call = (method, parameters) => new Promise((resolve, reject) => {
	const request = new LS2Request();
	request.send({
		service: SERVICE_ID,
		method,
		parameters,
		onSuccess: resolve,
		onFailure: (err) => reject(new Error(err?.errorText || err?.message || 'LS2 request failed'))
	});
});

class LoginForm extends Component {
	state = {
		email: '',
		password: '',
		twoFactor: '',
		loading: false,
		error: null,
		info: null,
		tokenCookies: null,
		showTwoFactor: false
	};

	handleChange = (field) => (ev) => {
		this.setState({[field]: ev.value});
	};

	handleSubmit = async () => {
		const {email, password} = this.state;
		if (!email || !password) {
			this.setState({error: 'Email and password are required.'});
			return;
		}
		this.setState({loading: true, error: null, info: 'Contacting Floatplane...'});
		try {
			const response = await ls2Call('login', {
				username: email,
				password
			});
			if (response.returnValue === false) {
				throw new Error(response.errorText || 'Login failed');
			}
			const requiresTwoFactor = Boolean(response.requiresTwoFactor || (response.body && response.body.needs2FA));
			this.setState({
				info: response.message || (response.body && response.body.message) || 'Login successful.',
				tokenCookies: response.cookies || null,
				showTwoFactor: requiresTwoFactor
			});
			if (!requiresTwoFactor) {
				this.props.onLoginSuccess(response);
			}
		} catch (err) {
			this.setState({error: err.message});
		} finally {
			this.setState({loading: false});
		}
	};

	handleSubmitTwoFactor = async () => {
		const {twoFactor, tokenCookies} = this.state;
		if (!twoFactor) {
			this.setState({error: 'Two-factor code required.'});
			return;
		}
		this.setState({loading: true, error: null, info: 'Verifying two-factor token...'});
		try {
			const response = await ls2Call('factor', {
				token: twoFactor,
				cookies: tokenCookies || []
			});
			if (response.returnValue === false) {
				throw new Error(response.errorText || 'Two-factor verification failed');
			}
			this.setState({info: 'Two-factor verification succeeded.'});
			this.props.onLoginSuccess(response);
		} catch (err) {
			this.setState({error: err.message});
		} finally {
			this.setState({loading: false});
		}
	};

	render() {
		const {email, password, twoFactor, loading, error, info, showTwoFactor} = this.state;
		return (
			<div className="loginForm">
				<Input
					value={email}
					onChange={this.handleChange('email')}
					type="email"
					size="large"
					placeholder="Email address"
				/>
				<Input
					value={password}
					onChange={this.handleChange('password')}
					type="password"
					size="large"
					placeholder="Password"
				/>
				<Button onClick={this.handleSubmit} disabled={loading} size="large">
					Sign In
				</Button>
				{showTwoFactor ? (
					<div className="twoFactor">
						<Input
							value={twoFactor}
							onChange={this.handleChange('twoFactor')}
							type="number"
							size="large"
							placeholder="Enter two-factor code"
						/>
						<Button onClick={this.handleSubmitTwoFactor} disabled={loading} size="large">
							Verify Code
						</Button>
					</div>
				) : null}
				{loading ? <Spinner centered show /> : null}
				{info ? <BodyText>{info}</BodyText> : null}
				{error ? (
					<BodyText style={{color: '#ff6f6f'}}>
						{error}
					</BodyText>
				) : null}
			</div>
		);
	}
}

LoginForm.propTypes = {
	onLoginSuccess: PropTypes.func.isRequired
};

export default kind({
	name: 'LoginFormWrapper',
	render: (props) => <LoginForm {...props} />
});
