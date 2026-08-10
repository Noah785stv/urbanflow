import { AccessTokenPayload } from '../auth/types/access-token-payload.interface';
import { UserRole } from './enums/user-role.enum';
import { UserController } from './user.controller';
import { UserService } from './user.service';

interface MockUserService {
  getProfile: jest.Mock;
  updateProfile: jest.Mock;
  deleteAccount: jest.Mock;
}

describe('UserController', () => {
  let controller: UserController;
  let userService: MockUserService;
  const currentUser: AccessTokenPayload = {
    sub: 'user-id',
    tenantId: 'tenant-id',
    role: UserRole.Citizen,
  };

  beforeEach(() => {
    userService = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      deleteAccount: jest.fn(),
    };
    controller = new UserController(userService as unknown as UserService);
  });

  it("getMe délègue à UserService.getProfile avec l'id de l'utilisateur courant", async () => {
    userService.getProfile.mockResolvedValue({ id: 'user-id' });

    const result = await controller.getMe(currentUser);

    expect(userService.getProfile).toHaveBeenCalledWith('user-id');
    expect(result).toEqual({ id: 'user-id' });
  });

  it("updateMe délègue à UserService.updateProfile avec l'id de l'utilisateur courant", async () => {
    const dto = { preferredModes: [] };
    userService.updateProfile.mockResolvedValue({ id: 'user-id' });

    const result = await controller.updateMe(currentUser, dto);

    expect(userService.updateProfile).toHaveBeenCalledWith('user-id', dto);
    expect(result).toEqual({ id: 'user-id' });
  });

  it("deleteMe délègue à UserService.deleteAccount avec l'id de l'utilisateur courant", async () => {
    await controller.deleteMe(currentUser);

    expect(userService.deleteAccount).toHaveBeenCalledWith('user-id');
  });
});
