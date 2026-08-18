import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';

export class LineLoginDto {
  idToken: string;
}

export class AdminLoginDto {
  email: string;
  password: string;
}

export class RefreshTokenDto {
  refreshToken: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('line')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or Register customer via LINE LIFF ID Token' })
  @ApiResponse({ status: 200, description: 'Successfully authenticated with LINE' })
  async loginWithLine(@Body() dto: LineLoginDto) {
    return this.authService.loginWithLine(dto.idToken);
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin and Staff Login with Email and Password' })
  @ApiResponse({ status: 200, description: 'Admin successfully authenticated' })
  async loginAdmin(@Body() dto: AdminLoginDto) {
    return this.authService.loginAdmin(dto.email, dto.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh expired JWT access token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }
}
