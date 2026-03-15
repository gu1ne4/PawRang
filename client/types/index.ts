export interface User {
  pk?: number;
  id?: number;
  username: string;
  fullName?: string;
  fullname?: string;
  contactNumber?: string;
  contactnumber?: string;
  employeeID?: string;
  employeeid?: string;
  email: string;
  role: string;
  department?: string;
  departmend?: string;
  status: string;
  userImage?: string;
  userimage?: string;
  dateCreated?: string;
  datecreated?: string;
}

export interface CurrentUser {
  id?: number;
  pk?: number;
  username: string;
  fullName?: string;
  role: string;
  userImage?: string;
}

export interface ModalConfig {
  type: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: string | JSX.Element;
  onConfirm?: () => void;
  showCancel: boolean;
}

export type Role = 'Admin' | 'Veterinarian' | 'Receptionist' | 'User' | 'Moderator';
export type Department = 'General Practice' | 'Surgery' | 'Internal Medicine' | 'Dentistry' | 'Administrative Services' | 'Marketing';
export type Status = 'Active' | 'Disabled';