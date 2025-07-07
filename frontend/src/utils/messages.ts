export const errorMessages = {
  required: (field: string) => `${field}は必須です`,
  maxLength: (field: string, max: number) => `${field}は${max}文字以内で入力してください`,
  notExist: (field: string) => `選択した${field}は存在しません`,
};
