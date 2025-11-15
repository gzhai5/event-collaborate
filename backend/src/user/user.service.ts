import { HttpException, Injectable, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const userData = this.userRepository.create(createUserDto);
    return this.userRepository.save(userData);
  }

  findAll() {
    return this.userRepository.find();
  }

  async findOne(id: string) {
    const userData = await this.userRepository.findOneBy({ id });
    if (!userData) {
      this.logger.error(`User with ID ${id} not found.`);
      throw new HttpException('User not found', 404);
    }
    return userData;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const existingUser = await this.userRepository.findOneBy({
      id: id,
    });
    if (!existingUser) {
      this.logger.error(`User with ID ${id} not found for update.`);
      throw new HttpException('User not found', 404);
    }
    const userData = this.userRepository.merge(existingUser, updateUserDto);
    return await this.userRepository.save(userData);
  }

  async remove(id: string) {
    const existingUser = await this.findOne(id);
    return await this.userRepository.remove(existingUser);
  }
}
