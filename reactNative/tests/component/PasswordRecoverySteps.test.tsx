import {act,fireEvent,render,screen,userEvent} from '@testing-library/react-native';
import {PasswordRecoverySteps} from '@/features/auth/screens/PasswordRecoverySteps';
import type {PasswordRecoveryActions} from '@/features/auth/screens/PasswordRecoverySteps';

const codeName='M\u00e3 \u0111\u1eb7t l\u1ea1i m\u1eadt kh\u1ea9u';
const verifyName='X\u00e1c minh m\u00e3';
const resetName='\u0110\u1ed5i m\u1eadt kh\u1ea9u';
function props(actions:PasswordRecoveryActions){return{email:'user@example.test',actions,requestRef:{current:null},onChangeEmail:jest.fn(),onResend:jest.fn().mockResolvedValue({kind:'accepted',email:'user@example.test'})};}

it('only opens new-password entry after server verification and finishes after reset succeeds',async()=>{
 const verify=jest.fn().mockResolvedValueOnce({kind:'error',error:'invalid-code'}).mockResolvedValueOnce({kind:'verified'});
 const reset=jest.fn().mockResolvedValue({kind:'reset'});
 await render(<PasswordRecoverySteps {...props({verify,reset})} />);
 const user=userEvent.setup();
 expect(screen.getByRole('button',{name:verifyName})).toBeDisabled();
 await fireEvent.changeText(screen.getByLabelText(codeName),'01 234 567');
 await user.press(screen.getByRole('button',{name:verifyName}));
 expect(screen.getByRole('alert')).toHaveTextContent(/M\u00e3 kh\u00f4ng h\u1ee3p l\u1ec7/);
 expect(screen.queryByLabelText('M\u1eadt kh\u1ea9u m\u1edbi')).toBeNull();
 await user.press(screen.getByRole('button',{name:verifyName}));
 expect(screen.getByLabelText('Mật khẩu mới')).toHaveProp('secureTextEntry',true);
 expect(screen.getByLabelText('Nhập lại mật khẩu mới')).toHaveProp('secureTextEntry',true);
 await user.press(screen.getByRole('button',{name:'Hiện mật khẩu mới'}));
 expect(screen.getByLabelText('Mật khẩu mới')).toHaveProp('secureTextEntry',false);
 expect(screen.getByLabelText('Nhập lại mật khẩu mới')).toHaveProp('secureTextEntry',true);
 await user.press(screen.getByRole('button',{name:'Ẩn mật khẩu mới'}));
 await fireEvent.changeText(screen.getByLabelText('M\u1eadt kh\u1ea9u m\u1edbi'),'password');
 await fireEvent.changeText(screen.getByLabelText('Nh\u1eadp l\u1ea1i m\u1eadt kh\u1ea9u m\u1edbi'),'password');
 await user.press(screen.getByRole('button',{name:resetName}));
 expect(reset).toHaveBeenCalledWith({code:'01234567',password:'password',confirmPassword:'password'},expect.anything());
 expect(screen.getByRole('header',{name:'\u0110\u1ed5i m\u1eadt kh\u1ea9u th\u00e0nh c\u00f4ng'})).toBeVisible();
 expect(screen.queryByLabelText(codeName)).toBeNull();
 expect(screen.queryByLabelText('M\u1eadt kh\u1ea9u m\u1edbi')).toBeNull();
});

it('clears pasted code after accepted resend without automatically verifying it',async()=>{
 const verify=jest.fn(),reset=jest.fn();
 const p=props({verify,reset});
 await render(<PasswordRecoverySteps {...p} />);
 const user=userEvent.setup();
 await fireEvent.changeText(screen.getByLabelText(codeName),'12345678');
 await user.press(screen.getByRole('button',{name:'G\u1eedi l\u1ea1i m\u00e3'}));
 expect(p.onResend).toHaveBeenCalledWith('user@example.test',expect.anything());
 expect(screen.getByLabelText(codeName)).toHaveProp('value','');
 expect(verify).not.toHaveBeenCalled();
});

it('prevents concurrent resend while verification is pending',async()=>{
 let finish!:(v:{kind:'verified'})=>void;
 const verify=jest.fn(()=>new Promise<{kind:'verified'}>(resolve=>{finish=resolve;}));
 const p=props({verify,reset:jest.fn()});
 await render(<PasswordRecoverySteps {...p} />);
 const user=userEvent.setup();
 await fireEvent.changeText(screen.getByLabelText(codeName),'12345678');
 await user.press(screen.getByRole('button',{name:verifyName}));
 expect(screen.getByRole('button',{name:'G\u1eedi l\u1ea1i m\u00e3'})).toBeDisabled();
 await user.press(screen.getByRole('button',{name:'G\u1eedi l\u1ea1i m\u00e3'}));
 expect(p.onResend).not.toHaveBeenCalled();
 await act(()=>finish({kind:'verified'}));
});


it('shows confirmation errors and returns to code entry when it expires during password entry',async()=>{
 const verify=jest.fn().mockResolvedValue({kind:'verified'});
 const reset=jest.fn().mockResolvedValueOnce({kind:'invalid',fields:{confirmPassword:'mismatch'}}).mockResolvedValueOnce({kind:'error',error:'invalid-code'});
 await render(<PasswordRecoverySteps {...props({verify,reset})} />);
 const user=userEvent.setup();
 await fireEvent.changeText(screen.getByLabelText(codeName),'12345678');
 await user.press(screen.getByRole('button',{name:verifyName}));
 await user.press(screen.getByRole('button',{name:resetName}));
 expect(screen.getByRole('alert')).toHaveTextContent('M\u1eadt kh\u1ea9u nh\u1eadp l\u1ea1i kh\u00f4ng kh\u1edbp.');
 await user.press(screen.getByRole('button',{name:resetName}));
 expect(screen.getByLabelText(codeName)).toBeVisible();
 expect(screen.queryByLabelText('M\u1eadt kh\u1ea9u m\u1edbi')).toBeNull();
 expect(screen.getByText(/M\u00e3 kh\u00f4ng h\u1ee3p l\u1ec7/)).toBeVisible();
});

it('keeps the current code and retry available when resend fails',async()=>{
 const p=props({verify:jest.fn(),reset:jest.fn()});
 p.onResend.mockResolvedValue({kind:'error',error:'network'});
 await render(<PasswordRecoverySteps {...p} />);
 const user=userEvent.setup();
 await fireEvent.changeText(screen.getByLabelText(codeName),'12345678');
 await user.press(screen.getByRole('button',{name:'G\u1eedi l\u1ea1i m\u00e3'}));
 expect(screen.getByLabelText(codeName)).toHaveProp('value','12345678');
 expect(screen.getByText(/Ki\u1ec3m tra m\u1ea1ng/)).toBeVisible();
 expect(screen.getByRole('button',{name:'G\u1eedi l\u1ea1i m\u00e3'})).not.toBeDisabled();
});
