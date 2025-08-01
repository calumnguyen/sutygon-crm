import React from 'react';

interface DocumentRetentionModalProps {
  show: boolean;
  documentType: string;
  documentName: string;
  onConfirm: () => void;
}

// Function to determine file category based on customer name (using given name - last word)
function getFileCategory(name: string): string {
  if (!name) return 'A-C';
  
  // Split the name and get the last word (given name in Vietnamese)
  const nameParts = name.trim().split(' ');
  const givenName = nameParts[nameParts.length - 1]; // Last word is the given name
  const firstLetter = givenName.charAt(0).toUpperCase();
  
  if (firstLetter >= 'A' && firstLetter <= 'C') return 'A-C';
  if (firstLetter >= 'D' && firstLetter <= 'F') return 'D-F';
  if (firstLetter >= 'G' && firstLetter <= 'I') return 'G-I';
  if (firstLetter >= 'J' && firstLetter <= 'L') return 'J-L';
  if (firstLetter >= 'M' && firstLetter <= 'O') return 'M-O';
  if (firstLetter >= 'P' && firstLetter <= 'R') return 'P-R';
  if (firstLetter >= 'S' && firstLetter <= 'U') return 'S-U';
  if (firstLetter >= 'V' && firstLetter <= 'X') return 'V-X';
  if (firstLetter >= 'Y' && firstLetter <= 'Z') return 'Y-Z';
  
  return 'A-C'; // Default fallback
}

export const DocumentRetentionModal: React.FC<DocumentRetentionModalProps> = ({
  show,
  documentType,
  documentName,
  onConfirm,
}) => {
  console.log('=== DocumentRetentionModal Debug ===');
  console.log('show:', show);
  console.log('documentType:', documentType);
  console.log('documentName:', documentName);
  
  if (!show) {
    console.log('Modal not showing - show is false');
    return null;
  }

  const fileCategory = getFileCategory(documentName);
  console.log('fileCategory:', fileCategory);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-600">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Lưu Trữ Giấy Tờ
            </h2>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4 mb-6 text-left">
            <p className="text-white text-base leading-relaxed">
              Vui lòng giữ <span className="font-bold text-yellow-400">{documentType}</span> của khách hàng{' '}
              <span className="font-bold text-blue-400">{documentName}</span> và bảo quản trong hồ sơ thuộc nhóm{' '}
              <span className="font-bold text-green-400 text-lg">[{fileCategory}]</span>
            </p>
            
            <div className="mt-3 pt-3 border-t border-gray-600">
              <p className="text-gray-300 text-sm">
                <span className="font-medium">Trạng thái:</span>{' '}
                <span className="text-green-400 font-medium">Hiện Đang Lưu Hồ Sơ</span>
              </p>
            </div>
          </div>

          <button
            onClick={onConfirm}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Xác Nhận Đã Lưu Trữ
          </button>
        </div>
      </div>
    </div>
  );
}; 