from pydantic import BaseModel, EmailStr
from typing import Optional

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    name: str
    company_name: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    company_id: str
    name: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class UserForgotPassword(BaseModel):
    email: EmailStr

