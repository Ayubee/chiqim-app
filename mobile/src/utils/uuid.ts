import 'react-native-uuid';
import { v4 as uuidv4 } from 'react-native-uuid';

export function generateUUID(): string {
  return uuidv4() as string;
}
