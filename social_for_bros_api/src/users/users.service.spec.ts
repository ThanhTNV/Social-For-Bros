import { UsersService } from './users.service';
import { UserEntity } from 'database/entities/user.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('UsersService', () => {
  let usersService: UsersService;

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    usersService = app.get<UsersService>(UsersService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create and save a new user', async () => {
      const username = 'testuser';
      const password = 'testpass123';
      const mockUser: UserEntity = {
        id: '1',
        username,
        password,
      };

      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await usersService.createUser(username, password);

      expect(mockUserRepository.create).toHaveBeenCalledWith({
        username,
        password,
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const mockUsers: UserEntity[] = [
        { id: '1', username: 'user1', password: 'pass1' },
        { id: '2', username: 'user2', password: 'pass2' },
      ];

      mockUserRepository.find.mockResolvedValue(mockUsers);

      const result = await usersService.findAll();

      expect(mockUserRepository.find).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });

    it('should return an empty array when no users exist', async () => {
      mockUserRepository.find.mockResolvedValue([]);

      const result = await usersService.findAll();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return a user when found by username', async () => {
      const username = 'testuser';
      const mockUser: UserEntity = {
        id: '1',
        username,
        password: 'testpass',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await usersService.findOne(username);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found', async () => {
      const username = 'nonexistent';

      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await usersService.findOne(username);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username },
      });
      expect(result).toBeNull();
    });
  });
});
