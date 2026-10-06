import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import Subscription from './Subscription';
import {createStripeMembershipCheckout,confirmStripeMembershipCheckout,getMembershipCheckoutConfig,getMembershipQuote,getRecurringMembership,cancelRecurringMembership} from '../utils/authService';
let mockSearch='',mockAuth:any;
jest.mock('react-router-dom',()=>({Link:({children}:any)=><span>{children}</span>,useNavigate:()=>jest.fn(),useLocation:()=>({search:mockSearch})}),{virtual:true});
jest.mock('../components/layout/Layout',()=>({children}:any)=><div>{children}</div>);
jest.mock('../components/shared/BannerCTA',()=>()=>null);
jest.mock('../contexts/AuthContext',()=>({useAuth:()=>mockAuth}));
jest.mock('../utils/authService');
beforeEach(()=>{
  jest.clearAllMocks();mockSearch='';mockAuth={isAuthenticated:true,hasActiveMembership:false,isLoading:false,user:{trial:{eligible:true,used:false}},refreshUser:jest.fn().mockResolvedValue(undefined)};
  (getMembershipCheckoutConfig as jest.Mock).mockResolvedValue({stripe:{configured:true},paypal:{configured:false}});
  (getMembershipQuote as jest.Mock).mockResolvedValue({finalPrice:299,basePrice:299,discountPercent:0});
  (getRecurringMembership as jest.Mock).mockResolvedValue({subscription:null});
});
test('trial requires explicit renewal consent before card checkout and permits retry',async()=>{
  (createStripeMembershipCheckout as jest.Mock).mockRejectedValue(new Error('Please try again.'));
  render(<Subscription/>);const button=await screen.findByRole('button',{name:'Add card & start free trial'});
  expect(button).toBeDisabled();expect(screen.getByText(/£0 today/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('checkbox'));expect(button).toBeEnabled();fireEvent.click(button);
  await screen.findByText('Please try again.');expect(createStripeMembershipCheckout).toHaveBeenCalledWith(undefined);expect(button).toBeEnabled();
  expect(screen.getByText(/I agree to a 7-day complimentary trial, then £299.00 per year/)).toBeInTheDocument();
});
test('return confirmation never offers another checkout or grants access without verification',async()=>{
  mockSearch='?stripe_session_id=cs_test_example';(confirmStripeMembershipCheckout as jest.Mock).mockResolvedValue({active:false,pending:false});
  render(<Subscription/>);await screen.findByText(/Your membership has not yet been confirmed/);
  expect(screen.getByRole('button',{name:'Check membership again'})).toBeInTheDocument();expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();expect(getMembershipCheckoutConfig).not.toHaveBeenCalled();
});
test('trial cancellation is one click, reflects server confirmation and retains access dates',async()=>{
  const sub={recurring:true,billingStatus:'trialing',expiresAt:'2030-10-08T04:00:00Z',renewalAmount:299,cancelAtPeriodEnd:false};
  (getRecurringMembership as jest.Mock).mockResolvedValue({subscription:sub});(cancelRecurringMembership as jest.Mock).mockResolvedValue({subscription:{...sub,cancelAtPeriodEnd:true}});
  render(<Subscription/>);fireEvent.click(await screen.findByRole('button',{name:'Cancel membership renewal'}));
  await screen.findByRole('heading',{name:'Your renewal is cancelled'});expect(cancelRecurringMembership).toHaveBeenCalledTimes(1);expect(mockAuth.refreshUser).toHaveBeenCalled();expect(screen.getByText(/8 October 2030/)).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Cancel membership renewal'})).not.toBeInTheDocument();
});
test('failed cancellation remains available and never reports success',async()=>{
  (getRecurringMembership as jest.Mock).mockResolvedValue({subscription:{recurring:true,billingStatus:'active',expiresAt:'2030-10-08T04:00:00Z'}});
  (cancelRecurringMembership as jest.Mock).mockRejectedValue(new Error('Unable to cancel. Please try again.'));
  render(<Subscription/>);fireEvent.click(await screen.findByRole('button',{name:'Cancel membership renewal'}));await screen.findByText('Unable to cancel. Please try again.');expect(screen.getByRole('button',{name:'Cancel membership renewal'})).toBeEnabled();expect(screen.queryByRole('heading',{name:'Your renewal is cancelled'})).not.toBeInTheDocument();
});
test('legacy annual members keep their existing terms',async()=>{
  mockAuth.hasActiveMembership=true;mockAuth.user.membership={paymentProvider:'stripe',expiresAt:'2030-10-08T04:00:00Z'};
  render(<Subscription/>);await screen.findByText('Your existing membership does not renew automatically.');expect(screen.queryByRole('button',{name:'Cancel membership renewal'})).not.toBeInTheDocument();
});
test('legacy trials are preserved and do not claim another complimentary period',async()=>{
  mockAuth.hasActiveMembership=true;mockAuth.user={membership:{paymentProvider:'trial'},trial:{eligible:false,used:true,expiresAt:'2030-10-08T04:00:00Z'}};
  render(<Subscription/>);await screen.findByText(/Your original card-free trial lasts until/);expect(await screen.findByRole('button',{name:'Join for £299.00 per year'})).toBeDisabled();expect(screen.queryByRole('button',{name:'Add card & start free trial'})).not.toBeInTheDocument();
});
