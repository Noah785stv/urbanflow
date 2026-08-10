import { UserRole } from '../user/enums/user-role.enum';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

interface MockAuthService {
  register: jest.Mock;
  verifyEmail: jest.Mock;
  login: jest.Mock;
  issueAccessToken: jest.Mock;
  logout: jest.Mock;
}

describe('AuthController', () => {
  let controller: AuthController;
  let authService: MockAuthService;

  beforeEach(() => {
    authService = {
      register: jest.fn(),
      verifyEmail: jest.fn(),
      login: jest.fn(),
      issueAccessToken: jest.fn(),
      logout: jest.fn(),
    };
    controller = new AuthController(authService as unknown as AuthService);
  });

  it('register délègue à AuthService.register', async () => {
    const dto = {
      email: 'jane@example.com',
      password: 'un-mot-de-passe-solide',
    };
    authService.register.mockResolvedValue({ id: '1', email: dto.email });

    const result = await controller.register(dto);

    expect(authService.register).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: '1', email: dto.email });
  });

  it('verifyEmail délègue à AuthService.verifyEmail', async () => {
    const dto = { token: 'abc' };

    await controller.verifyEmail(dto);

    expect(authService.verifyEmail).toHaveBeenCalledWith(dto);
  });

  it('login délègue à AuthService.login', async () => {
    const dto = {
      email: 'jane@example.com',
      password: 'un-mot-de-passe-solide',
    };
    authService.login.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    const result = await controller.login(dto);

    expect(authService.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ accessToken: 'access', refreshToken: 'refresh' });
  });

  it('refresh délègue à AuthService.issueAccessToken avec le sub du refresh token', async () => {
    authService.issueAccessToken.mockResolvedValue({
      accessToken: 'new-access-token',
    });

    const result = await controller.refresh({ sub: 'user-id' });

    expect(authService.issueAccessToken).toHaveBeenCalledWith('user-id');
    expect(result).toEqual({ accessToken: 'new-access-token' });
  });

  it('logout délègue à AuthService.logout avec le sub du access token', async () => {
    await controller.logout({
      sub: 'user-id',
      tenantId: 'tenant-id',
      role: UserRole.Citizen,
    });

    expect(authService.logout).toHaveBeenCalledWith('user-id');
  });
});
