// ===== VikriDrishti Auth System (localStorage) =====

const AUTH_KEY='vd_auth';
const USERS_KEY='vd_users';

// Seed a demo account if no users exist

function seedUsers(){
  if(!localStorage.getItem(USERS_KEY)){
    const demo=[{
      id:'u1',
      name:'Admin User',
      email:'admin@vikridrishti.com',
      password:'admin123',
      role:'Admin',
      company:'VikriDrishti Inc.',
      phone:'+91 98765 43210',
      avatar:null,
      created:new Date().toISOString()
    }];
    localStorage.setItem(USERS_KEY,JSON.stringify(demo));
  }
}
seedUsers();

function getUsers(){return JSON.parse(localStorage.getItem(USERS_KEY)||'[]')}
function saveUsers(u){localStorage.setItem(USERS_KEY,JSON.stringify(u))}

// Register
function registerUser(name,email,password,company){
  const users=getUsers();
  if(users.find(u=>u.email.toLowerCase()===email.toLowerCase())) return {ok:false,msg:'Email already registered'};
  const user={
    id:'u'+Date.now(),
    name,email:email.toLowerCase(),password,
    role:'Analyst',
    company:company||'',
    phone:'',avatar:null,
    created:new Date().toISOString()
  };
  users.push(user);
  saveUsers(users);
  return {ok:true,user};
}

// Login
function loginUser(email,password){
  const users=getUsers();
  const u=users.find(u=>u.email.toLowerCase()===email.toLowerCase());
  if(!u) return {ok:false,msg:'No account found with this email'};
  if(u.password!==password) return {ok:false,msg:'Incorrect password'};
  const session={...u};delete session.password;
  session.loginAt=new Date().toISOString();
  localStorage.setItem(AUTH_KEY,JSON.stringify(session));
  return {ok:true,user:session};
}

// Logout
function logoutUser(){
  localStorage.removeItem(AUTH_KEY);
  window.location.href='login.html';
}

// Current user
function getCurrentUser(){
  const s=localStorage.getItem(AUTH_KEY);
  return s?JSON.parse(s):null;
}

// Update profile
function updateProfile(updates){
  const cur=getCurrentUser();
  if(!cur) return {ok:false,msg:'Not logged in'};
  const users=getUsers();
  const idx=users.findIndex(u=>u.id===cur.id);
  if(idx===-1) return {ok:false,msg:'User not found'};
  // Apply updates
  if(updates.name) users[idx].name=updates.name;
  if(updates.company!==undefined) users[idx].company=updates.company;
  if(updates.phone!==undefined) users[idx].phone=updates.phone;
  if(updates.role) users[idx].role=updates.role;
  // Password change
  if(updates.newPassword){
    if(updates.currentPassword!==users[idx].password) return {ok:false,msg:'Current password is incorrect'};
    users[idx].password=updates.newPassword;
  }
  saveUsers(users);
  // Update session
  const session={...users[idx]};delete session.password;
  session.loginAt=cur.loginAt;
  localStorage.setItem(AUTH_KEY,JSON.stringify(session));
  return {ok:true,user:session};
}

// Auth guard — redirect if not logged in
function requireAuth(){
  if(!getCurrentUser()){
    window.location.href='login.html';
    return false;
  }
  return true;
}

// Get user initials for avatar
function getInitials(name){
  return name.split(' ').map(w=>w[0]).join('').toUpperCase().substring(0,2);
}
