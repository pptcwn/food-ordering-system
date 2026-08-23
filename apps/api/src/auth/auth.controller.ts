import { Controller, Post, Body, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';
import { AuthService } from './auth.service';

export class LineLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;
}

export class AdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
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

  /**
   * Local-only demo entry points.  AuthService returns 404 unless both
   * NODE_ENV=development and DEV_DEMO_ENABLED=true are configured.
   */
  @Post('dev/customer')
  @HttpCode(HttpStatus.OK)
  async loginDevelopmentCustomer() {
    return this.authService.loginDevelopmentCustomer();
  }

  @Post('dev/staff/:role')
  @HttpCode(HttpStatus.OK)
  async loginDevelopmentStaff(@Param('role') role: 'admin' | 'kitchen') {
    return this.authService.loginDevelopmentStaff(role);
  }
}
