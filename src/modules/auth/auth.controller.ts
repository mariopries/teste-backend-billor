import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { IsEmail, IsString, MinLength } from 'class-validator';

class LoginDto {
  @ApiProperty({
    description: 'Email do usuário',
    example: 'admin@demo.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'admin123',
    minLength: 3,
  })
  @IsString()
  @MinLength(3)
  password!: string;
}

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @ApiBody({
    description: 'Credenciais para autenticação',
    type: LoginDto,
    examples: {
      default: {
        summary: 'Exemplo',
        value: {
          email: 'admin@demo.com',
          password: 'admin123',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'JWT gerado com sucesso',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
      },
      required: ['access_token'],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas' })
  async login(@Body() dto: LoginDto) {
    const token = await this.auth.validateAndIssue(dto.email, dto.password);
    if (!token) throw new UnauthorizedException('Invalid credentials');
    return { access_token: token };
  }
}
